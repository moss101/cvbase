#!/usr/bin/env bash
# W3 AI edge-function smoke: auth + entitlement + metering + real (non-mock)
# output. Run with the stack up AND functions served:
#   supabase functions serve --env-file .env.cvbase.local --no-verify-jwt &
#   bash supabase/tests/w3-ai-smoke.sh
# Requires a valid GEMINI_API_KEY in .env.cvbase.local for the real-output checks.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
API="http://127.0.0.1:54321"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
S=$(date +%s)
fail=0; ok(){ echo "PASS: $1"; }; bad(){ echo "FAIL: $1"; fail=1; }

mkuser(){ # $1=email $2=plan('' for free) -> echoes token
  curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
  local uid; uid=$(psql "$PSQL" -tA -c "select id from auth.users where email='$1';")
  [ -n "$2" ] && psql "$PSQL" -tA -c "insert into subscriptions (user_id,plan_id,status) values ('$uid','$2','active') on conflict (user_id) do update set plan_id='$2',status='active';" >/dev/null
  curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"test123456\"}" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}
fn(){ curl -s --max-time 120 -X POST "$API/functions/v1/$1" -H "apikey: $ANON_KEY" ${2:+-H "Authorization: Bearer $2"} -H "Content-Type: application/json" -d "$3"; }
code(){ curl -s -o /dev/null -w "%{http_code}" --max-time 120 -X POST "$API/functions/v1/$1" -H "apikey: $ANON_KEY" ${2:+-H "Authorization: Bearer $2"} -H "Content-Type: application/json" -d "$3"; }

FE="w3free$S@example.com"; PE="w3pro$S@example.com"; EE="w3elite$S@example.com"
FT=$(mkuser "$FE" ""); PT=$(mkuser "$PE" "pro"); ET=$(mkuser "$EE" "elite")
FUID=$(psql "$PSQL" -tA -c "select id from auth.users where email='$FE';")

# 1) Auth: every function rejects a missing token (first call warms the module).
for f in ats-analyze ai-suggest ai-linkedin ai-cover-letter ai-trajectory ai-headshot ai-parse-pdf; do
  c=$(code "$f" "" '{}'); [ "$c" = "401" ] && ok "$f rejects no-token (401)" || bad "$f no-token -> $c (expected 401)"
done

# 2) ats-analyze: real report + metered + over-limit (free = 3).
R=$(fn ats-analyze "$FT" '{"resumeText":"Jane Doe\nSkills\nReact, SQL, Node"}')
echo "$R" | grep -q '"atsScore"' && ok "ats-analyze returns a real report" || bad "ats-analyze no report: ${R:0:120}"
for i in 1 2 3; do fn ats-analyze "$FT" '{"resumeText":"x"}' >/dev/null; done
c=$(code ats-analyze "$FT" '{"resumeText":"x"}'); [ "$c" = "402" ] && ok "ats-analyze over-limit -> 402" || bad "ats-analyze 4th -> $c (expected 402)"

# 3) ai-suggest: real, non-mock output + metering + ai_logs.
R=$(fn ai-suggest "$PT" '{"kind":"bullets","payload":{"jobTitle":"Registered Nurse"}}')
n=$(echo "$R" | python3 -c "import sys,json;r=json.load(sys.stdin).get('result');print(len(r) if isinstance(r,list) else 0)" 2>/dev/null || echo 0)
[ "${n:-0}" -ge 5 ] && ok "ai-suggest bullets returns $n real items" || bad "ai-suggest bullets -> ${R:0:120}"

# 4) ai-linkedin: free gated (403), Pro allowed (200 real).
c=$(code ai-linkedin "$FT" '{"targetRole":"RN"}'); [ "$c" = "403" ] && ok "ai-linkedin gated for free (403)" || bad "ai-linkedin free -> $c (expected 403)"
R=$(fn ai-linkedin "$PT" '{"targetRole":"Senior RN","headline":"RN","about":"ICU nurse."}')
echo "$R" | grep -q '"linkedinScore"' && ok "ai-linkedin real result for Pro" || bad "ai-linkedin pro -> ${R:0:120}"

# 5) ai-headshot: Elite-gated (free -> 403).
c=$(code ai-headshot "$FT" '{"imageBase64":"x"}'); [ "$c" = "403" ] && ok "ai-headshot gated for free (403)" || bad "ai-headshot free -> $c (expected 403)"

# 6) ai_logs recorded safe metadata.
logs=$(psql "$PSQL" -tA -c "select count(*) from ai_logs where user_id in ('$FUID',(select id from auth.users where email='$PE'));")
[ "${logs:-0}" -ge 1 ] && ok "ai_logs recorded ($logs rows)" || bad "ai_logs empty"

psql "$PSQL" -tA -c "delete from auth.users where email in ('$FE','$PE','$EE');" >/dev/null
echo "----"; [ "$fail" = "0" ] && echo "W3 AI SMOKE: ALL PASS" || echo "W3 AI SMOKE: FAILURES"
exit $fail
