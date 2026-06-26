#!/usr/bin/env bash
# W5 RLS AUDIT — exhaustive cross-user isolation against the LOCAL Supabase stack.
#   bash supabase/tests/w5-rls-audit.sh
#
# Goes beyond the W2 smoke: for EVERY table it asserts both read isolation and
# write isolation (cross-user UPDATE/DELETE + forged-ownership INSERT), plus the
# service_role-only tables (subscriptions/usage_counters/ai_logs) reject ALL
# client writes — including by the owner. Requires the stack up (supabase start).
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
S=$(date +%s)
fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# A PostgREST write is "blocked" if RLS rejected it (42501 / permission denied /
# row-level security) OR it matched zero rows (return=representation gives []).
blocked() { grep -qiE "42501|row-level security|permission denied|no rows" "$1" || [ "$(tr -d '[:space:]' < "$1")" = "[]" ]; }

mkuser() {  # $1=email -> echoes an access_token for a pre-confirmed user
  curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
  curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"test123456\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}
# REST helpers bound to a user's JWT.
get()  { curl -s "$API/rest/v1/$1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $2"; }
jlen() { python3 -c "import sys,json;print(len(json.load(sys.stdin)))"; }

psql "$PSQL" -tA -c "delete from auth.users where email like 'rls5%@example.com';" >/dev/null 2>&1 || true

EA="rls5a${S}@example.com"; EB="rls5b${S}@example.com"
TA=$(mkuser "$EA"); TB=$(mkuser "$EB")
{ [ -n "$TA" ] && [ -n "$TB" ]; } && ok "two confirmed users + tokens" || { bad "could not create users/tokens"; echo "(is the stack up? curl $API/rest/v1/ )"; exit 1; }
UIDA=$(psql "$PSQL" -tA -c "select id from auth.users where email='$EA';")
UIDB=$(psql "$PSQL" -tA -c "select id from auth.users where email='$EB';")

# --- seed: each user's own rows via their own JWT ---
curl -s -X POST "$API/rest/v1/resumes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"user_id\":\"$UIDA\",\"title\":\"A resume\",\"is_primary\":true}" > "$TMP/ra.json"
curl -s -X POST "$API/rest/v1/resumes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"user_id\":\"$UIDB\",\"title\":\"B resume\",\"is_primary\":true}" > "$TMP/rb.json"
RIDA=$(python3 -c "import sys,json;print(json.load(open('$TMP/ra.json'))[0]['id'])")
RIDB=$(python3 -c "import sys,json;print(json.load(open('$TMP/rb.json'))[0]['id'])")
curl -s -X POST "$API/rest/v1/job_applications" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d "{\"user_id\":\"$UIDB\",\"company\":\"AcmeB\",\"role\":\"MD\",\"status\":\"offer\"}" >/dev/null
JIDB=$(psql "$PSQL" -tA -c "select id from public.job_applications where user_id='$UIDB' order by created_at desc limit 1;")
curl -s -X POST "$API/rest/v1/resume_versions" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d "{\"user_id\":\"$UIDB\",\"resume_id\":\"$RIDB\",\"label\":\"v1\"}" >/dev/null
VIDB=$(psql "$PSQL" -tA -c "select id from public.resume_versions where user_id='$UIDB' order by created_at desc limit 1;")
# service_role-only rows (seeded directly, bypassing RLS as the Edge Functions do)
psql "$PSQL" -tA -c "insert into public.subscriptions(user_id,plan_id) values ('$UIDA','pro'),('$UIDB','elite') on conflict (user_id) do update set plan_id=excluded.plan_id;" >/dev/null
psql "$PSQL" -tA -c "insert into public.usage_counters(user_id,month,ats_scans) values ('$UIDA','2026-06',2),('$UIDB','2026-06',9) on conflict do nothing;" >/dev/null
psql "$PSQL" -tA -c "insert into public.ai_logs(user_id,function,status) values ('$UIDB','ai-suggest','ok');" >/dev/null

echo "--- profiles (auto-provisioned per user) ---"
[ "$(get "profiles?select=id" "$TA" | jlen)" = "1" ] && ok "profiles: A sees exactly its own row" || bad "profiles read isolation"
[ "$(get "profiles?id=eq.$UIDB&select=id" "$TA" | tr -d '[:space:]')" = "[]" ] && ok "profiles: A cannot read B" || bad "profiles read leak (A saw B)"
curl -s -X PATCH "$API/rest/v1/profiles?id=eq.$UIDB" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"bio":"HACKED"}' > "$TMP/p.json"
{ blocked "$TMP/p.json" && [ "$(psql "$PSQL" -tA -c "select bio from public.profiles where id='$UIDB';")" != "HACKED" ]; } && ok "profiles: A cannot update B" || bad "profiles WRITE LEAK (A updated B)"

echo "--- resumes ---"
[ "$(get "resumes?select=id" "$TA" | jlen)" = "1" ] && ok "resumes: A sees only its own" || bad "resumes read isolation"
curl -s -X PATCH "$API/rest/v1/resumes?id=eq.$RIDB" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"title":"HACKED"}' > "$TMP/r.json"
{ blocked "$TMP/r.json" && [ "$(psql "$PSQL" -tA -c "select title from public.resumes where id='$RIDB';")" = "B resume" ]; } && ok "resumes: A cannot update B" || bad "resumes WRITE LEAK (A updated B)"
curl -s -X POST "$API/rest/v1/resumes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"user_id\":\"$UIDB\",\"title\":\"forged\"}" > "$TMP/rf.json"
{ blocked "$TMP/rf.json" && [ "$(psql "$PSQL" -tA -c "select count(*) from public.resumes where title='forged';")" = "0" ]; } && ok "resumes: A cannot forge a row owned by B" || bad "resumes FORGE LEAK (A inserted as B)"

echo "--- resume_versions ---"
[ "$(get "resume_versions?select=id" "$TA" | tr -d '[:space:]')" = "[]" ] && ok "resume_versions: A cannot read B's versions" || bad "resume_versions read leak"
curl -s -X DELETE "$API/rest/v1/resume_versions?id=eq.$VIDB" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Prefer: return=representation" > "$TMP/vd.json"
[ "$(psql "$PSQL" -tA -c "select count(*) from public.resume_versions where id='$VIDB';")" = "1" ] && ok "resume_versions: A cannot delete B's version" || bad "resume_versions DELETE LEAK"
curl -s -X POST "$API/rest/v1/resume_versions" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"user_id\":\"$UIDB\",\"resume_id\":\"$RIDB\",\"label\":\"forged\"}" > "$TMP/vf.json"
{ blocked "$TMP/vf.json" && [ "$(psql "$PSQL" -tA -c "select count(*) from public.resume_versions where label='forged';")" = "0" ]; } && ok "resume_versions: A cannot forge a row owned by B" || bad "resume_versions FORGE LEAK"

echo "--- job_applications ---"
curl -s -X PATCH "$API/rest/v1/job_applications?id=eq.$JIDB" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"company":"HACKED"}' > "$TMP/j.json"
{ blocked "$TMP/j.json" && [ "$(psql "$PSQL" -tA -c "select company from public.job_applications where id='$JIDB';")" = "AcmeB" ]; } && ok "job_applications: A cannot update B" || bad "job_applications WRITE LEAK"
curl -s -X DELETE "$API/rest/v1/job_applications?id=eq.$JIDB" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Prefer: return=representation" >/dev/null
[ "$(psql "$PSQL" -tA -c "select count(*) from public.job_applications where id='$JIDB';")" = "1" ] && ok "job_applications: A cannot delete B" || bad "job_applications DELETE LEAK"

echo "--- subscriptions (owner READ-only; NO client writes) ---"
[ "$(get "subscriptions?select=plan_id" "$TA" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['plan_id'] if len(d)==1 else 'BAD')")" = "pro" ] && ok "subscriptions: A reads only its own plan" || bad "subscriptions read isolation"
[ "$(get "subscriptions?user_id=eq.$UIDB&select=plan_id" "$TA" | tr -d '[:space:]')" = "[]" ] && ok "subscriptions: A cannot read B's plan" || bad "subscriptions read leak"
curl -s -X PATCH "$API/rest/v1/subscriptions?user_id=eq.$UIDA" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"plan_id":"elite"}' > "$TMP/su.json"
{ blocked "$TMP/su.json" && [ "$(psql "$PSQL" -tA -c "select plan_id from public.subscriptions where user_id='$UIDA';")" = "pro" ]; } && ok "subscriptions: owner cannot self-upgrade (no update policy)" || bad "subscriptions SPOOF LEAK (owner wrote own plan)"

echo "--- usage_counters (owner READ-only; NO client writes) ---"
[ "$(get "usage_counters?select=ats_scans" "$TA" | jlen)" = "1" ] && ok "usage_counters: A reads only its own" || bad "usage_counters read isolation"
curl -s -X PATCH "$API/rest/v1/usage_counters?user_id=eq.$UIDA&month=eq.2026-06" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"ats_scans":0}' > "$TMP/uu.json"
{ blocked "$TMP/uu.json" && [ "$(psql "$PSQL" -tA -c "select ats_scans from public.usage_counters where user_id='$UIDA';")" = "2" ]; } && ok "usage_counters: owner cannot reset own usage" || bad "usage_counters SPOOF LEAK (owner zeroed usage)"

echo "--- ai_logs (service_role ONLY) ---"
[ "$(get "ai_logs?select=id" "$TA" | tr -d '[:space:]')" = "[]" ] && ok "ai_logs: not client-readable" || bad "ai_logs read leak"

psql "$PSQL" -tA -c "delete from auth.users where email in ('$EA','$EB');" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "W5 RLS AUDIT: ALL PASS" || echo "W5 RLS AUDIT: FAILURES PRESENT"
exit $fail
