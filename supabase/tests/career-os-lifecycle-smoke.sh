#!/usr/bin/env bash
# COS-007 lifecycle smoke against the LOCAL Supabase stack.
#   source scripts/career-os-local-env.sh && bash supabase/tests/career-os-lifecycle-smoke.sh
# Seeds one row in EVERY Career OS table (plus an application-bound resume and
# PRISM run), then exercises the real edge functions served by the local edge
# runtime container (supabase_edge_runtime_cvbase_ bind-mounts
# supabase/functions, policy=oneshot, so the repo code is what runs):
#   account-export  -> version 2, every section present and populated, PRISM
#                      binding columns exported, run bodies not;
#   account-delete  -> every Career OS table (and the legacy ones) has zero
#                      rows for the user afterwards. When the local runtime has
#                      no STRIPE_SECRET_KEY the function cannot even boot (its
#                      Stripe client is built at import), so the script falls
#                      back to the auth admin DELETE the function itself calls
#                      and says so ("SUBSTITUTED") — the cascade assertions are
#                      identical either way.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
S=$(date +%s); fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
q() { psql "$PSQL" -tA -c "$1" | head -1; }

TABLES="career_profiles career_facts career_fact_references career_goals career_goal_revisions opportunities campaigns campaign_opportunities application_artifacts interview_sessions application_outcomes opportunity_analyses career_actions action_runs coach_conversations coach_messages career_events user_notifications career_preferences career_scenarios career_insights career_migrations"

mkuser() {
  curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
  curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"test123456\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}
fncode() { # name token body -> http code, body in $TMP/fn.json, headers in $TMP/fn.h
  curl -s -o "$TMP/fn.json" -D "$TMP/fn.h" -w "%{http_code}" --max-time 60 -X POST "$API/functions/v1/$1" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $2" -H "Content-Type: application/json" -d "$3"
}

# The migration's table list must match this script's (a new table shows up
# here as a FAIL rather than silently going untested).
MIG_TABLES=$(grep -oE '^create table public\.[a-z_]+' supabase/migrations/20260920100000_career_os_foundation.sql | sed 's/create table public\.//' | sort | tr '\n' ' ')
[ "$(echo $TABLES | tr ' ' '\n' | sort | tr '\n' ' ')" = "$MIG_TABLES" ] && ok "script covers all $(echo $TABLES | wc -w | tr -d ' ') tables the migration creates" || bad "table list drift: migration has [$MIG_TABLES]"

psql "$PSQL" -tA -c "delete from auth.users where email like 'cosl%@example.com';" >/dev/null 2>&1 || true
E="cosl${S}@example.com"; T=$(mkuser "$E")
[ -n "$T" ] && ok "user + token" || { bad "no token (is the stack up?)"; exit 1; }
U=$(q "select id from auth.users where email='$E';")

# --- Seed one row per table (service role, respecting same-owner FKs) ----------
psql "$PSQL" -q <<SQL
do \$\$
declare
  u uuid := '$U';
  r uuid; f uuid; g uuid; o uuid; c uuid; a uuid; act uuid; run uuid; conv uuid;
begin
  insert into public.resumes (user_id, title, is_primary, data) values (u, 'Main', true, '{"skills":["Kafka"]}') returning id into r;
  insert into public.career_profiles (user_id, headline) values (u, 'Data platform engineer');
  insert into public.career_facts (user_id, kind, title, source_fingerprint) values (u, 'skill', 'Kafka', 'skill|kafka') returning id into f;
  insert into public.career_fact_references (user_id, fact_id, artifact_kind, artifact_id, artifact_section) values (u, f, 'resume', r, 'skills');
  insert into public.career_goals (user_id, title, role, is_primary) values (u, 'Senior data platform role', 'Senior Data Platform Engineer', true) returning id into g;
  -- career_goal_revisions: written by the career_goals_snapshot trigger.
  insert into public.opportunities (user_id, title, company, captured_content) values (u, 'Senior Data Platform Engineer', 'Streamline', 'Kafka, Kubernetes, Terraform') returning id into o;
  insert into public.campaigns (user_id, goal_id, name) values (u, g, 'Berlin platform roles') returning id into c;
  insert into public.campaign_opportunities (campaign_id, opportunity_id, user_id) values (c, o, u);
  insert into public.job_applications (user_id, company, role, status, stage, opportunity_id, campaign_id, goal_id) values (u, 'Streamline', 'Senior Data Platform Engineer', 'wishlist', 'preparing', o, c, g) returning id into a;
  update public.resumes set application_id = a, origin = jsonb_build_object('kind','prism') where id = r;
  insert into public.prism_runs (user_id, status, jd_text, cv_text, application_id, source_resume_id, source_resume_revision, idempotency_key)
    values (u, 'awaiting_answers', 'SECRET-JD-TEXT', 'SECRET-CV-TEXT', a, r, 1, 'tailor:smoke') returning id into run;
  update public.job_applications set prism_run_id = run where id = a;
  insert into public.application_artifacts (user_id, application_id, kind, title) values (u, a, 'note', 'Recruiter call');
  insert into public.interview_sessions (user_id, application_id, interview_type) values (u, a, 'video');
  insert into public.application_outcomes (user_id, application_id, kind) values (u, a, 'submitted');
  insert into public.opportunity_analyses (user_id, opportunity_id, application_id, opportunity_revision) values (u, o, a, 1);
  insert into public.career_actions (user_id, action_type, title, dedupe_key, context_refs) values (u, 'TAILOR_CV', 'Tailor your CV for Streamline', 'TAILOR_CV:'||a::text, jsonb_build_object('application', a)) returning id into act;
  insert into public.action_runs (user_id, action_id, tool, idempotency_key, status) values (u, act, 'prism_tailor', 'run:smoke', 'completed');
  insert into public.coach_conversations (user_id, title) values (u, 'Prep for Streamline') returning id into conv;
  insert into public.coach_messages (user_id, conversation_id, role, content) values (u, conv, 'user', 'How should I prepare?');
  insert into public.career_events (user_id, event_name, subject_refs) values (u, 'cv_tailoring_started', jsonb_build_object('application', a));
  insert into public.user_notifications (user_id, kind, title, dedupe_key, action_id) values (u, 'action_required', 'Finish tailoring', 'notify:'||act::text, act);
  insert into public.career_preferences (user_id, proactive_enabled) values (u, false);
  insert into public.career_scenarios (user_id, name) values (u, 'Two offers');
  insert into public.career_insights (user_id, kind, statement) values (u, 'response_rate', 'Not enough data yet');
  insert into public.career_migrations (user_id, migration, item_kind, old_id, new_id) values (u, 'career_os_v1', 'job_application', a::text, o);
end \$\$;
SQL
SEEDED=0; MISSING=""
for t in $TABLES; do
  n=$(q "select count(*) from public.$t where user_id='$U';")
  if [ "$n" -ge 1 ]; then SEEDED=$((SEEDED+1)); else MISSING="$MISSING $t"; fi
done
[ -z "$MISSING" ] && ok "one row seeded in every Career OS table ($SEEDED/22)" || bad "no rows in:$MISSING"

# --- account-export (real edge function on the local runtime) ---------------------
C=$(fncode account-export "$T" '{}')
[ "$C" = "200" ] && ok "account-export -> 200" || bad "account-export -> $C: $(head -c200 "$TMP/fn.json")"
grep -qi 'content-disposition: attachment; filename="cvbase-export-' "$TMP/fn.h" && ok "export is an attachment" || bad "no Content-Disposition attachment header"
python3 - "$TMP/fn.json" "$U" $TABLES <<'PY' && ok "export v2: every Career OS section present and populated; PRISM binding columns exported, run bodies not" || bad "export body check failed"
import json,re,sys
d=json.load(open(sys.argv[1])); uid=sys.argv[2]; tables=sys.argv[3:]
def camel(t): return re.sub(r'_([a-z])', lambda m: m.group(1).upper(), t)
assert d['format']=='cvbase-account-export' and d['version']==2, ('format', d.get('version'))
assert d['account']['id']==uid
single={'career_profiles':'careerProfile','career_preferences':'careerPreferences'}
for t in tables:
    key=single.get(t, camel(t))
    assert key in d, f'missing section {key}'
    v=d[key]
    if t in single: assert isinstance(v,dict) and v['user_id']==uid, key
    else: assert isinstance(v,list) and len(v)==1 and v[0]['user_id']==uid, (key, v)
for key in ['profile','resumes','resumeVersions','jobApplications','subscription','usageCounters','prismRuns','prismLineFlags','atsReports','headshots']:
    assert key in d, f'missing legacy section {key}'
assert d['resumes'][0]['application_id']==d['jobApplications'][0]['id'] and d['resumes'][0]['origin']=={'kind':'prism'}
run=d['prismRuns'][0]
assert run['application_id']==d['jobApplications'][0]['id'] and run['source_resume_id']==d['resumes'][0]['id']
assert run['source_resume_revision']==1 and run['idempotency_key']=='tailor:smoke'
assert 'jd_text' not in run and 'cv_text' not in run and 'checkpoint' not in run
assert 'SECRET-JD-TEXT' not in json.dumps(d) and 'SECRET-CV-TEXT' not in json.dumps(d), 'run bodies leaked'
assert d['jobApplications'][0]['prism_run_id']==run['id']
assert d['opportunities'][0]['captured_content']=='Kafka, Kubernetes, Terraform', 'user-pasted JD is user data and is exported'
PY

# --- account-delete ----------------------------------------------------------------
# The function imports _shared/stripe.ts, which needs STRIPE_SECRET_KEY at
# module load; the local edge runtime has no Stripe secret, so the worker
# cannot boot (WORKER_ERROR). In that case the delete step is SUBSTITUTED by
# the auth admin REST call account-delete itself makes (auth.admin.deleteUser
# == DELETE /auth/v1/admin/users/{id}); the cascade assertions are the same.
C=$(fncode account-delete "$T" '{"confirm":"nobody@example.com"}')
if [ "$C" = "500" ] && grep -q WORKER_ERROR "$TMP/fn.json"; then
  echo "SUBSTITUTED: account-delete cannot boot on the local runtime (no STRIPE_SECRET_KEY: $(head -c120 "$TMP/fn.json")); deleting via the auth admin API instead"
  DC=$(curl -s -o "$TMP/del.json" -w "%{http_code}" -X DELETE "$API/auth/v1/admin/users/$U" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY")
  [ "$DC" = "200" ] && ok "auth admin DELETE /admin/users/{id} -> 200 (substitute for account-delete)" || bad "admin delete -> $DC: $(head -c160 "$TMP/del.json")"
else
  [ "$C" = "400" ] && grep -q confirm_mismatch "$TMP/fn.json" && ok "delete with wrong email -> 400 confirm_mismatch" || bad "wrong-email delete -> $C: $(head -c160 "$TMP/fn.json")"
  C=$(fncode account-delete "$T" "{\"confirm\":\"$E\"}")
  [ "$C" = "200" ] && grep -q '"deleted":true' "$TMP/fn.json" && ok "account-delete -> 200 deleted:true" || bad "account-delete -> $C: $(head -c200 "$TMP/fn.json")"
fi
[ "$(q "select count(*) from auth.users where id='$U';")" = "0" ] && ok "auth user removed" || bad "auth user still present"
LEFT=""; TOTAL=0
for t in $TABLES prism_runs resumes job_applications profiles; do
  col=user_id; [ "$t" = "profiles" ] && col=id
  n=$(q "select count(*) from public.$t where $col='$U';")
  TOTAL=$((TOTAL+n)); [ "$n" != "0" ] && LEFT="$LEFT $t=$n"
done
[ "$TOTAL" = "0" ] && ok "every Career OS + legacy table has zero rows for the user after delete" || bad "rows survived the delete:$LEFT"

psql "$PSQL" -tA -c "delete from auth.users where email='$E';" >/dev/null 2>&1
echo "----"
[ "$fail" = "0" ] && echo "CAREER OS LIFECYCLE SMOKE: ALL PASS" || echo "CAREER OS LIFECYCLE SMOKE: FAILURES PRESENT"
exit $fail
