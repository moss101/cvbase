#!/usr/bin/env bash
# W7 atomic-metering race smoke against the LOCAL Supabase stack.
#   bash supabase/tests/w7-metering-race-smoke.sh
# Fires many CONCURRENT consume_usage() calls with a limit of 3 and asserts
# exactly 3 succeed and the counter lands on exactly 3 — i.e. the row-locked
# check-and-increment can't be raced past the cap (the bug the old read-then-
# write metering had). consume_usage is service_role-only by grant.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"; PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
S=$(date +%s); fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
MONTH=$(date -u +%Y-%m)
LIMIT=3; N=12

# A throwaway user id (FK to auth.users) so the counter row is valid.
psql "$PSQL" -tA -c "delete from auth.users where email like 'w7m%@example.com';" >/dev/null 2>&1 || true
curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d "{\"email\":\"w7m${S}@example.com\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
RUSER=$(psql "$PSQL" -tA -c "select id from auth.users where email='w7m${S}@example.com';")
[ -n "$RUSER" ] && ok "test user created" || { bad "no user (stack up?)"; exit 1; }

# Fire N concurrent consume_usage RPC calls (service_role) for the same user/month.
for i in $(seq 1 "$N"); do
  curl -s -X POST "$API/rest/v1/rpc/consume_usage" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"p_user\":\"$RUSER\",\"p_month\":\"$MONTH\",\"p_kind\":\"atsScans\",\"p_limit\":$LIMIT}" \
    > "$TMP/r$i.json" &
done
wait

TRUES=$(grep -l '^true' "$TMP"/r*.json 2>/dev/null | wc -l | tr -d ' ')
[ "$TRUES" = "$LIMIT" ] && ok "exactly $LIMIT of $N concurrent calls were allowed (got $TRUES)" || bad "race leak: $TRUES of $N allowed (expected $LIMIT)"

FINAL=$(psql "$PSQL" -tA -c "select ats_scans from public.usage_counters where user_id='$RUSER' and month='$MONTH';")
[ "$FINAL" = "$LIMIT" ] && ok "counter landed on exactly $LIMIT (no over-count)" || bad "counter over-incremented: $FINAL (expected $LIMIT)"

# A further call must be rejected (false) now that we're at the cap.
AGAIN=$(curl -s -X POST "$API/rest/v1/rpc/consume_usage" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" -d "{\"p_user\":\"$RUSER\",\"p_month\":\"$MONTH\",\"p_kind\":\"atsScans\",\"p_limit\":$LIMIT}")
[ "$AGAIN" = "false" ] && ok "over-cap call is rejected (false)" || bad "over-cap call not rejected: '$AGAIN'"

psql "$PSQL" -tA -c "delete from auth.users where id='$RUSER';" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "W7 METERING RACE SMOKE: ALL PASS" || echo "W7 METERING RACE SMOKE: FAILURES PRESENT"
exit $fail
