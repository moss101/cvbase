#!/usr/bin/env bash
# W2 cross-user RLS isolation smoke test against the LOCAL Supabase stack.
#   bash supabase/tests/w2-rls-smoke.sh
# Verifies: a user reads/writes only its own resumes + job_applications; cannot
# read or delete another user's rows; ai_logs is not client-readable; and clients
# cannot write the service_role-only subscriptions table.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
S=$(date +%s)
fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }

mkuser() {  # $1=email -> echoes an access_token for a confirmed user
  local email="$1" uid
  curl -s -X POST "$API/auth/v1/signup" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"test123456\"}" >/dev/null
  uid=$(psql "$PSQL" -tA -c "select id from auth.users where email='$email';")
  curl -s -X PUT "$API/auth/v1/admin/users/$uid" -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
    -d '{"email_confirm":true}' >/dev/null
  curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"test123456\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}

EA="rlsA${S}@example.com"; EB="rlsB${S}@example.com"
TA=$(mkuser "$EA"); TB=$(mkuser "$EB")
{ [ -n "$TA" ] && [ -n "$TB" ]; } && ok "two confirmed users + tokens" || bad "could not create users/tokens"

# Each user inserts a resume + a job via their own JWT
curl -s -X POST "$API/rest/v1/resumes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"title":"A resume","is_primary":true,"data":{"skills":["a"]}}' >/dev/null
curl -s -X POST "$API/rest/v1/job_applications" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"company":"AcmeA","role":"RN","status":"applied"}' >/dev/null
curl -s -X POST "$API/rest/v1/resumes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"title":"B resume","is_primary":true}' >/dev/null
curl -s -X POST "$API/rest/v1/job_applications" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"company":"AcmeB","role":"MD","status":"offer"}' >/dev/null

# A reads only its own rows
RA=$(curl -s "$API/rest/v1/resumes?select=title" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d),d[0]['title'] if d else '')")
[ "$RA" = "1 A resume" ] && ok "RLS resumes: A sees only its own ($RA)" || bad "RLS resumes leak: A got '$RA'"
JA=$(curl -s "$API/rest/v1/job_applications?select=company" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d),d[0]['company'] if d else '')")
[ "$JA" = "1 AcmeA" ] && ok "RLS jobs: A sees only its own ($JA)" || bad "RLS jobs leak: A got '$JA'"

# A cannot delete B's job
BJID=$(psql "$PSQL" -tA -c "select id from public.job_applications where company='AcmeB';")
curl -s -X DELETE "$API/rest/v1/job_applications?id=eq.$BJID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Prefer: return=representation" >/tmp/w2_del.json 2>/dev/null
DELN=$(python3 -c "import sys,json;print(len(json.load(open('/tmp/w2_del.json'))))" 2>/dev/null || echo 0)
STILL=$(psql "$PSQL" -tA -c "select count(*) from public.job_applications where id='$BJID';")
{ [ "$DELN" = "0" ] && [ "$STILL" = "1" ]; } && ok "RLS: A cannot delete B's job (deleted=$DELN, still=$STILL)" || bad "RLS write leak: A deleted B's job (deleted=$DELN, remaining=$STILL)"

# ai_logs is not client-readable (RLS has no policies -> zero rows)
AIBODY=$(curl -s "$API/rest/v1/ai_logs?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA")
[ "$AIBODY" = "[]" ] && ok "ai_logs not client-readable (empty)" || bad "ai_logs unexpectedly returned: $AIBODY"

# subscriptions is service_role-write-only (client insert denied)
curl -s -o /tmp/w2_sub.json -X POST "$API/rest/v1/subscriptions" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d '{"plan_id":"elite"}' >/dev/null
grep -qiE "42501|row-level security|permission denied" /tmp/w2_sub.json && ok "subscriptions client insert denied by RLS" || bad "subscriptions insert NOT denied: $(head -c120 /tmp/w2_sub.json)"

psql "$PSQL" -tA -c "delete from auth.users where email in ('$EA','$EB');" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "RLS SMOKE: ALL PASS" || echo "RLS SMOKE: FAILURES PRESENT"
exit $fail
