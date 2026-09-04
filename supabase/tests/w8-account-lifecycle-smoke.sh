#!/usr/bin/env bash
# W8 account lifecycle smoke against the LOCAL Supabase stack.
#   supabase start
#   supabase functions serve --env-file .env.cvbase.local --no-verify-jwt &
#   bash supabase/tests/w8-account-lifecycle-smoke.sh
# Covers: ats_reports / headshots RLS (owner select+delete, no client insert,
# no cross-user reads), the profiles updated_at trigger, account-export (shape,
# attachment header, no Stripe ids, signed headshot URL) and account-delete
# (confirm mismatch -> 400; correct email -> user, rows and storage objects gone).
# Stripe is not exercised: the seeded subscription has no stripe_subscription_id,
# so account-delete's cancel step is a no-op (the w4 smoke covers Stripe).
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
S=$(date +%s); fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

mkuser() {
  curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
  curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"test123456\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}
rest() { # method path token [body]
  curl -s -X "$1" "$API/rest/v1/$2" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $3" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" ${4:+-d "$4"}
}
fncode() { # name token body -> http code, body in $TMP/fn.json, headers in $TMP/fn.h
  curl -s -o "$TMP/fn.json" -D "$TMP/fn.h" -w "%{http_code}" --max-time 60 -X POST "$API/functions/v1/$1" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $2" -H "Content-Type: application/json" -d "$3"
}

psql "$PSQL" -tA -c "delete from auth.users where email like 'w8%@example.com';" >/dev/null 2>&1 || true
A="w8a${S}@example.com"; TA=$(mkuser "$A")
B="w8b${S}@example.com"; TB=$(mkuser "$B")
[ -n "$TA" ] && [ -n "$TB" ] && ok "two users + tokens" || { bad "no token (is the stack up?)"; exit 1; }
UA=$(psql "$PSQL" -tA -c "select id from auth.users where email='$A';")

# --- Seed A's data (service role writes what the edge functions would) --------
rest POST resumes "$TA" "{\"user_id\":\"$UA\",\"title\":\"Main\",\"is_primary\":true,\"data\":{\"skills\":[\"react\"]}}" > "$TMP/r.json"
RID=$(python3 -c "import sys,json;print(json.load(open('$TMP/r.json'))[0]['id'])" 2>/dev/null || echo '')
[ -n "$RID" ] && ok "resume seeded" || bad "resume insert failed: $(head -c160 "$TMP/r.json")"
rest POST resume_versions "$TA" "{\"user_id\":\"$UA\",\"resume_id\":\"$RID\",\"label\":\"v1\",\"data\":{}}" >/dev/null
rest POST job_applications "$TA" "{\"user_id\":\"$UA\",\"company\":\"Acme\",\"role\":\"RN\",\"status\":\"applied\"}" >/dev/null
psql "$PSQL" -tA -c "insert into public.subscriptions (user_id, plan_id, status, stripe_customer_id) values ('$UA','pro','active','cus_secret123') on conflict (user_id) do update set stripe_customer_id='cus_secret123';" >/dev/null 2>&1 \
  || psql "$PSQL" -tA -c "update public.subscriptions set stripe_customer_id='cus_secret123' where user_id='$UA';" >/dev/null
RPT=$(psql "$PSQL" -tA -c "insert into public.ats_reports (user_id, resume_id, job_description, report, score) values ('$UA','$RID',E'Senior RN\nLondon','{\"job\":null,\"report\":{\"atsScore\":81}}',81) returning id;")
[ -n "$RPT" ] && ok "ats_report seeded (service role)" || bad "ats_reports insert failed"
# A real object in the private bucket, plus its index row.
printf 'PNGDATA' > "$TMP/h.png"
UPC=$(curl -s -o "$TMP/up.json" -w "%{http_code}" -X POST "$API/storage/v1/object/headshots/$UA/smoke.png" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: image/png" --data-binary @"$TMP/h.png")
[ "$UPC" = "200" ] && ok "headshot object uploaded" || bad "headshot upload -> $UPC: $(head -c160 "$TMP/up.json")"
HID=$(psql "$PSQL" -tA -c "insert into public.headshots (user_id, storage_path) values ('$UA','$UA/smoke.png') returning id;")
[ -n "$HID" ] && ok "headshots row seeded" || bad "headshots insert failed"

# --- RLS ---------------------------------------------------------------------
N=$(rest GET "ats_reports?select=id,score" "$TA" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else 'err')")
[ "$N" = "1" ] && ok "owner lists own ats_reports" || bad "owner list ats_reports -> $N"
N=$(rest GET "ats_reports?select=id" "$TB" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else 'err')")
[ "$N" = "0" ] && ok "other user sees no ats_reports" || bad "cross-user ats_reports -> $N"
N=$(rest GET "headshots?select=id" "$TB" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else 'err')")
[ "$N" = "0" ] && ok "other user sees no headshots" || bad "cross-user headshots -> $N"
IC=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/rest/v1/ats_reports" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d "{\"user_id\":\"$UA\",\"report\":{}}")
[ "$IC" = "401" ] || [ "$IC" = "403" ] && ok "client insert into ats_reports refused ($IC)" || bad "client insert into ats_reports -> $IC"
rest DELETE "ats_reports?id=eq.$RPT" "$TB" >/dev/null
[ "$(psql "$PSQL" -tA -c "select count(*) from public.ats_reports where id='$RPT';")" = "1" ] && ok "other user cannot delete the report" || bad "cross-user delete removed the report"

# --- profiles updated_at trigger ---------------------------------------------
BEFORE=$(psql "$PSQL" -tA -c "select updated_at from public.profiles where id='$UA';")
sleep 1
rest PATCH "profiles?id=eq.$UA" "$TA" '{"first_name":"Smoke"}' >/dev/null
AFTER=$(psql "$PSQL" -tA -c "select updated_at from public.profiles where id='$UA';")
[ -n "$AFTER" ] && [ "$AFTER" != "$BEFORE" ] && ok "profiles.updated_at bumps on update" || bad "profiles.updated_at unchanged ($BEFORE -> $AFTER)"

# --- account-export ------------------------------------------------------------
C=$(fncode account-export "$TA" '{}')
[ "$C" = "200" ] && ok "account-export -> 200" || bad "account-export -> $C: $(head -c200 "$TMP/fn.json")"
grep -qi 'content-disposition: attachment; filename="cvbase-export-' "$TMP/fn.h" && ok "export is an attachment" || bad "no Content-Disposition attachment header"
python3 - "$TMP/fn.json" "$UA" <<'PY' && ok "export shape, counts, no Stripe ids, signed headshot url" || bad "export body check failed"
import json,sys
d=json.load(open(sys.argv[1])); uid=sys.argv[2]
assert d['format']=='cvbase-account-export' and d['version']==1, 'format'
assert d['account']['id']==uid, 'account id'
assert len(d['resumes'])==1 and len(d['resumeVersions'])==1 and len(d['jobApplications'])==1, 'row counts'
assert len(d['atsReports'])==1 and d['atsReports'][0]['score']==81, 'ats report'
assert d['subscription'] is not None and d['subscription']['planId' if 'planId' in d['subscription'] else 'plan_id']=='pro', 'subscription'
assert 'stripe' not in json.dumps(d['subscription']).lower(), 'stripe ids leaked'
assert 'cus_secret123' not in json.dumps(d), 'stripe customer id leaked'
hs=[h for h in d['headshots'] if h['storagePath']==f'{uid}/smoke.png']
assert hs and hs[0]['signedUrl'] and '/object/sign/headshots/' in hs[0]['signedUrl'], 'signed url'
PY
C=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/functions/v1/account-export" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d '{}')
[ "$C" = "401" ] && ok "account-export without a session -> 401" || bad "unauthenticated export -> $C"

# --- account-delete --------------------------------------------------------------
C=$(fncode account-delete "$TA" "{\"confirm\":\"$B\"}")
[ "$C" = "400" ] && grep -q confirm_mismatch "$TMP/fn.json" && ok "delete with wrong email -> 400 confirm_mismatch" || bad "wrong-email delete -> $C: $(head -c160 "$TMP/fn.json")"
C=$(fncode account-delete "$TA" '{}')
[ "$C" = "400" ] && ok "delete with no confirm -> 400" || bad "no-confirm delete -> $C"
[ "$(psql "$PSQL" -tA -c "select count(*) from auth.users where id='$UA';")" = "1" ] && ok "user still exists after refused deletes" || bad "user vanished after a refused delete"

UPPER=$(printf '%s' "$A" | tr '[:lower:]' '[:upper:]')
C=$(fncode account-delete "$TA" "{\"confirm\":\"  $UPPER \"}")
[ "$C" = "200" ] && grep -q '"deleted":true' "$TMP/fn.json" && ok "delete with matching email (case/space-insensitive) -> 200 deleted:true" || bad "delete -> $C: $(head -c200 "$TMP/fn.json")"
[ "$(psql "$PSQL" -tA -c "select count(*) from auth.users where id='$UA';")" = "0" ] && ok "auth user removed" || bad "auth user still present"
LEFT=$(psql "$PSQL" -tA -c "select (select count(*) from public.profiles where id='$UA')+(select count(*) from public.resumes where user_id='$UA')+(select count(*) from public.resume_versions where user_id='$UA')+(select count(*) from public.job_applications where user_id='$UA')+(select count(*) from public.subscriptions where user_id='$UA')+(select count(*) from public.ats_reports where user_id='$UA')+(select count(*) from public.headshots where user_id='$UA');")
[ "$LEFT" = "0" ] && ok "every user table cascaded" || bad "$LEFT owned rows survived the delete"
[ "$(psql "$PSQL" -tA -c "select count(*) from storage.objects where bucket_id='headshots' and name like '$UA/%';")" = "0" ] && ok "headshot storage objects removed" || bad "headshot objects survived"
C=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/functions/v1/account-export" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d '{}')
[ "$C" = "401" ] && ok "old session is dead after delete" || bad "old token still works -> $C"

psql "$PSQL" -tA -c "delete from auth.users where email in ('$A','$B');" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "W8 ACCOUNT LIFECYCLE SMOKE: ALL PASS" || echo "W8 ACCOUNT LIFECYCLE SMOKE: FAILURES PRESENT"
exit $fail
