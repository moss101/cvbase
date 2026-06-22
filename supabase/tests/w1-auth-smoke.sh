#!/usr/bin/env bash
# W1 auth smoke test — exercises the full Supabase auth flow end-to-end against
# the LOCAL stack (no browser). Run from anywhere; requires `supabase start`.
#   bash supabase/tests/w1-auth-smoke.sh
# Verifies: email-confirmation enforcement, the on_auth_user_created profile
# trigger, email delivery (Mailpit), sign-in after confirm, RLS isolation, and
# profile read/write through a user JWT.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"
MAILPIT="http://127.0.0.1:54324"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
STAMP=$(date +%s)
EMAIL="smoke${STAMP}@example.com"
PASSWORD="test123456"
fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }

# 1) Sign up with first/last name metadata
SIGNUP=$(curl -s -X POST "$API/auth/v1/signup" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"data\":{\"first_name\":\"Smoke\",\"last_name\":\"Test\"}}")
echo "$SIGNUP" | grep -q '"access_token"' \
  && bad "signup returned a session (email confirmation NOT enforced)" \
  || ok "signup enforces email confirmation (no session returned)"

# 2) Trigger provisioned a profile with the metadata names
PROF=$(psql "$PSQL" -tA -c "select first_name||'|'||last_name from public.profiles where email='$EMAIL';")
[ "$PROF" = "Smoke|Test" ] && ok "trigger provisioned profile ($PROF)" || bad "profile not provisioned (got '$PROF')"

# 3) User starts unconfirmed
CONF=$(psql "$PSQL" -tA -c "select coalesce(email_confirmed_at::text,'null') from auth.users where email='$EMAIL';")
[ "$CONF" = "null" ] && ok "user starts unconfirmed" || bad "user unexpectedly confirmed ($CONF)"

# 4) Mailpit (local mail catcher on :54324) received the confirmation email
got_mail=0
for _ in $(seq 1 10); do
  if curl -s "$MAILPIT/api/v1/messages" | grep -q "$EMAIL"; then got_mail=1; break; fi
  sleep 0.5
done
[ "$got_mail" = "1" ] && ok "confirmation email delivered (Mailpit)" \
  || bad "no confirmation email found in Mailpit for $EMAIL"

# 5) Confirm the user via service_role admin API (simulates clicking the link)
USERID=$(psql "$PSQL" -tA -c "select id from auth.users where email='$EMAIL';")
curl -s -X PUT "$API/auth/v1/admin/users/$USERID" -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
  -d '{"email_confirm":true}' >/dev/null

# 6) Sign in now succeeds
SIGNIN=$(curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$SIGNIN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
[ -n "$TOKEN" ] && ok "sign-in after confirmation returns a session" || bad "sign-in failed ($SIGNIN)"

# 7) RLS isolation: add a SECOND user, assert user1's token sees only its own profile
EMAIL2="smoke2${STAMP}@example.com"
psql "$PSQL" -tA -c "insert into auth.users (id,email,raw_user_meta_data,aud,role,instance_id) values (gen_random_uuid(),'$EMAIL2','{\"first_name\":\"Other\"}'::jsonb,'authenticated','authenticated','00000000-0000-0000-0000-000000000000');" >/dev/null
ROWS=$(curl -s "$API/rest/v1/profiles?select=id,email" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null)
[ "$ROWS" = "1" ] && ok "RLS: authed user sees only its own profile (rows=$ROWS, table has 2)" \
  || bad "RLS leak/err: user1 token returned '$ROWS' rows (expected 1)"

# 8) Profile update through the user's token persists
curl -s -X PATCH "$API/rest/v1/profiles?id=eq.$USERID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"job_title":"RN"}' >/dev/null
JT=$(psql "$PSQL" -tA -c "select job_title from public.profiles where id='$USERID';")
[ "$JT" = "RN" ] && ok "profile update via user token persisted (job_title=$JT)" || bad "profile update failed (got '$JT')"

# Cleanup
psql "$PSQL" -tA -c "delete from auth.users where email in ('$EMAIL','$EMAIL2');" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "SMOKE: ALL PASS" || echo "SMOKE: FAILURES PRESENT"
exit $fail
