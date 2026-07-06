#!/usr/bin/env bash
# PRISM edge-function E2E smoke: the full production path (auth → metering →
# NDJSON streaming → run-row checkpointing → provider/key-slot telemetry) for
# analyze → generate → finalize. Run with the stack up AND functions served:
#   supabase functions serve --env-file .env.cvbase.local --no-verify-jwt &
#   bash supabase/tests/prism-e2e-smoke.sh
# Requires real DEEPSEEK_API_KEYS (and optionally KIMI_API_KEYS) in
# .env.cvbase.local — the pipeline makes ~5-7 live model calls.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
API="http://127.0.0.1:54321"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
S=$(date +%s)
fail=0; ok(){ echo "PASS: $1"; }; bad(){ echo "FAIL: $1"; fail=1; }

E="prism$S@example.com"
curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$E\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
UID_=$(psql "$PSQL" -tA -c "select id from auth.users where email='$E';")
psql "$PSQL" -tA -c "insert into subscriptions (user_id,plan_id,status) values ('$UID_','pro','active') on conflict (user_id) do update set plan_id='pro',status='active';" >/dev/null
T=$(curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$E\",\"password\":\"test123456\"}" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))")
[ -n "$T" ] && ok "user + pro subscription + token" || { bad "no token"; exit 1; }

CV="Jordan Reyes — Backend Engineer, Berlin. Backend engineer with 6 years in Python and Go. Finch Analytics (2021-Present): built REST and gRPC services in Go serving 40k requests/minute; PostgreSQL schemas. Datawerk GmbH (2019-2021): Python ETL 200GB/day into Redshift. Skills: Go, Python, PostgreSQL, Docker, AWS."
JD="Senior Backend Engineer — Payments Platform (Berlin). Design and operate high-throughput event-driven services (Kafka) in Go or Python. Own PostgreSQL schema design. Kubernetes on AWS with Terraform. Requirements: 5+ years backend, distributed-systems fundamentals."

# ---- phase 1: analyze (NDJSON stream) --------------------------------------
PAYLOAD=$(JD="$JD" CV="$CV" python3 <<'PYEOF'
import json, os
print(json.dumps({'phase': 'analyze', 'jdText': os.environ['JD'], 'cvText': os.environ['CV'], 'templateId': 'classic'}))
PYEOF
)
A=$(curl -s --max-time 300 -X POST "$API/functions/v1/prism-tailor" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d "$PAYLOAD")
echo "$A" | grep -q '"type": *"stage"\|"type":"stage"' && ok "analyze streams stage events" || bad "no stage events: ${A:0:200}"
DONE_LINE=$(echo "$A" | grep '"done"' | tail -1)
RUN_ID=$(echo "$DONE_LINE" | python3 -c "import sys,json;print(json.loads(sys.stdin.read()).get('result',{}).get('runId',''))" 2>/dev/null)
[ -n "$RUN_ID" ] && ok "analyze done -> runId $RUN_ID" || { bad "no runId in done event: ${DONE_LINE:0:200}"; echo "$A" | tail -3; exit 1; }
QCOUNT=$(echo "$DONE_LINE" | python3 -c "import sys,json;print(len(json.loads(sys.stdin.read()).get('result',{}).get('questions',[])))")
[ "$QCOUNT" -ge 0 ] && ok "questions returned ($QCOUNT)"

# ---- phase 2: generate ------------------------------------------------------
ANSWERS=$(echo "$DONE_LINE" | python3 -c "
import sys, json
qs = json.loads(sys.stdin.read()).get('result',{}).get('questions',[])
print(json.dumps([{'questionId':q['id'],'question':q['question'],'answer':'No experience with this.'} for q in qs]))")
G=$(curl -s --max-time 300 -X POST "$API/functions/v1/prism-tailor" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d "{\"phase\":\"generate\",\"runId\":\"$RUN_ID\",\"answers\":$ANSWERS}")
echo "$G" | grep -q '"done"' && ok "generate completes" || { bad "generate no done: $(echo "$G" | tail -1 | head -c 200)"; }
echo "$G" | grep -q '"resume"' && ok "generate returns a resume" || bad "no resume in generate output"

# ---- DB assertions: checkpointing + provider telemetry ----------------------
STATUS=$(psql "$PSQL" -tA -c "select status from prism_runs where id='$RUN_ID';")
[ "$STATUS" = "review" ] && ok "run row reached status=review" || bad "run status=$STATUS (expected review)"
AGENTS=$(psql "$PSQL" -tA -c "select count(*) from prism_agent_logs where run_id='$RUN_ID' and status='ok';")
[ "$AGENTS" -ge 4 ] && ok "prism_agent_logs has $AGENTS ok agent rows" || bad "only $AGENTS agent rows"
PROVIDERS=$(psql "$PSQL" -tA -c "select count(*) from prism_agent_logs where run_id='$RUN_ID' and provider is not null and key_slot is not null;")
[ "$PROVIDERS" -ge 4 ] && ok "provider/key_slot telemetry populated ($PROVIDERS rows)" || bad "provider telemetry missing ($PROVIDERS rows with provider+key_slot)"
CALLS=$(psql "$PSQL" -tA -c "select count(*) from llm_call_logs where created_at > now() - interval '15 minutes';")
[ "$CALLS" -ge 4 ] && ok "llm_call_logs recorded $CALLS recent calls" || bad "llm_call_logs only $CALLS recent rows"

# ---- phase 3: finalize -------------------------------------------------------
# head -1: psql -tA still prints the "INSERT 0 1" command tag on a second line.
RESUME_ID=$(psql "$PSQL" -tA -c "insert into resumes (user_id, title, data) values ('$UID_','prism smoke','{}'::jsonb) returning id;" | head -1)
F=$(curl -s --max-time 60 -X POST "$API/functions/v1/prism-tailor" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d "{\"phase\":\"finalize\",\"runId\":\"$RUN_ID\",\"resumeId\":\"$RESUME_ID\"}")
echo "$F" | grep -q '"completed"' && ok "finalize -> completed" || bad "finalize: ${F:0:200}"
WIPED=$(psql "$PSQL" -tA -c "select (jd_text is null and cv_text is null) from prism_runs where id='$RUN_ID';")
[ "$WIPED" = "t" ] && ok "finalize wiped jd/cv text (data minimization)" || bad "jd/cv text not wiped"

echo "================================"
[ $fail -eq 0 ] && echo "PRISM E2E SMOKE PASSED" || { echo "PRISM E2E SMOKE FAILED"; exit 1; }
