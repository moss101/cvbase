#!/usr/bin/env bash
# W6 job-tracker CROSS-DEVICE sync smoke against the LOCAL Supabase stack.
#   bash supabase/tests/w6-tracker-sync-smoke.sh
# Proves the tracker is server-persisted (not localStorage-bound): a job added
# under one login (device 1) is visible AND editable under a *fresh* login
# (device 2 = a new JWT for the same user), and the edit round-trips to a third
# login. This is the W6 "verify cross-device" check for job_applications.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"; PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
S=$(date +%s); fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }
H=(-H "apikey: $ANON_KEY")

mkuser() {  # admin-create a confirmed user
  curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
}
login() {  # a fresh password grant == signing in on another device
  curl -s -X POST "$API/auth/v1/token?grant_type=password" "${H[@]}" \
    -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"test123456\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}

psql "$PSQL" -tA -c "delete from auth.users where email like 'w6t%@example.com';" >/dev/null 2>&1 || true
E="w6t${S}@example.com"; mkuser "$E"
RUSER=$(psql "$PSQL" -tA -c "select id from auth.users where email='$E';")

# Device 1: sign in and add a tracked job.
T1=$(login "$E")
[ -n "$T1" ] && ok "device 1 signed in" || { bad "device 1 login failed (stack up?)"; exit 1; }
curl -s -X POST "$API/rest/v1/job_applications" "${H[@]}" -H "Authorization: Bearer $T1" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"user_id\":\"$RUSER\",\"company\":\"Acme\",\"role\":\"RN\",\"status\":\"applied\"}" >/dev/null
ok "device 1 added a job (Acme / applied)"

# Device 2: a SEPARATE fresh login for the same user — must already see the job.
T2=$(login "$E")
SEEN=$(curl -s "$API/rest/v1/job_applications?select=company,status" "${H[@]}" -H "Authorization: Bearer $T2" | python3 -c "import sys,json;d=json.load(sys.stdin);print(f\"{len(d)} {d[0]['company']} {d[0]['status']}\" if d else '0')")
[ "$SEEN" = "1 Acme applied" ] && ok "device 2 (fresh login) sees the job from device 1 ($SEEN)" || bad "cross-device read failed: '$SEEN'"

# Device 2 edits the status; device 3 (another fresh login) must see the edit.
JID=$(psql "$PSQL" -tA -c "select id from public.job_applications where user_id='$RUSER' limit 1;")
curl -s -X PATCH "$API/rest/v1/job_applications?id=eq.$JID" "${H[@]}" -H "Authorization: Bearer $T2" -H "Content-Type: application/json" -d '{"status":"interview"}' >/dev/null
T3=$(login "$E")
ST=$(curl -s "$API/rest/v1/job_applications?id=eq.$JID&select=status" "${H[@]}" -H "Authorization: Bearer $T3" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['status'] if d else '')")
[ "$ST" = "interview" ] && ok "edit on device 2 round-trips to device 3 (status=$ST)" || bad "cross-device edit not synced: '$ST'"

psql "$PSQL" -tA -c "delete from auth.users where email='$E';" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "W6 TRACKER SYNC SMOKE: ALL PASS" || echo "W6 TRACKER SYNC SMOKE: FAILURES PRESENT"
exit $fail
