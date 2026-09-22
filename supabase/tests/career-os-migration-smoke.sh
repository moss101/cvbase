#!/usr/bin/env bash
# COS-007 migration smoke against the LOCAL Supabase stack.
#   source scripts/career-os-local-env.sh && bash supabase/tests/career-os-migration-smoke.sh
# Covers: career_os_migrate_user is restartable (second run maps nothing new,
# keeps the legacy application id, links it to its opportunity), the
# idempotent career_start_application RPC (same id twice; reapply = attempt 2),
# two-owner RLS on opportunities/career_facts, and rollback: with the
# career_os flag off the legacy tracker read still returns only the five
# legacy statuses and a write made through the new `stage` model survives.
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
jlen() { python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else 'err:'+str(d)[:120])"; }

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

psql "$PSQL" -tA -c "delete from auth.users where email like 'cosm%@example.com';" >/dev/null 2>&1 || true
A="cosma${S}@example.com"; TA=$(mkuser "$A")
B="cosmb${S}@example.com"; TB=$(mkuser "$B")
[ -n "$TA" ] && [ -n "$TB" ] && ok "two users + tokens" || { bad "no token (is the stack up?)"; exit 1; }
UA=$(q "select id from auth.users where email='$A';")
UB=$(q "select id from auth.users where email='$B';")

# --- Legacy data for A: primary resume + wishlist/applied tracker rows ----------
rest POST resumes "$TA" "{\"user_id\":\"$UA\",\"title\":\"Main\",\"is_primary\":true,\"data\":{\"skills\":[\"Kafka\",\"Terraform\"],\"experience\":[{\"id\":\"e1\",\"jobTitle\":\"Data Engineer\",\"company\":\"Streamline\",\"startDate\":\"2022\",\"endDate\":\"Present\",\"description\":\"pipelines\"}],\"education\":[{\"id\":\"ed1\",\"degree\":\"BSc\",\"school\":\"TU Berlin\"}],\"summary\":{\"professionalSummary\":\"Data platform engineer\"}}}" > "$TMP/r.json"
RID=$(python3 -c "import sys,json;print(json.load(open('$TMP/r.json'))[0]['id'])" 2>/dev/null || echo '')
[ -n "$RID" ] && ok "primary resume seeded" || bad "resume insert failed: $(head -c160 "$TMP/r.json")"
rest POST job_applications "$TA" "{\"user_id\":\"$UA\",\"company\":\"Acme\",\"role\":\"RN\",\"status\":\"wishlist\"}" > "$TMP/w.json"
WISH=$(python3 -c "import sys,json;print(json.load(open('$TMP/w.json'))[0]['id'])" 2>/dev/null || echo '')
rest POST job_applications "$TA" "{\"user_id\":\"$UA\",\"company\":\"Globex\",\"role\":\"MD\",\"status\":\"applied\"}" > "$TMP/a.json"
APPL=$(python3 -c "import sys,json;print(json.load(open('$TMP/a.json'))[0]['id'])" 2>/dev/null || echo '')
[ -n "$WISH" ] && [ -n "$APPL" ] && ok "wishlist + applied tracker rows seeded" || bad "tracker seed failed"
[ "$(q "select stage from public.job_applications where id='$WISH';")" = "saved" ] && ok "legacy wishlist write derives stage=saved" || bad "wishlist stage not derived"
[ "$(q "select stage from public.job_applications where id='$APPL';")" = "submitted" ] && ok "legacy applied write derives stage=submitted" || bad "applied stage not derived"

# --- Migrate twice: restartable, no duplicates ------------------------------------
R1=$(q "select public.career_os_migrate_user('$UA');")
echo "$R1" | python3 -c "import sys,json;d=json.load(sys.stdin);assert d['opportunities']==2 and d['facts']>=4,d" 2>/dev/null \
  && ok "first migrate mapped 2 opportunities + facts: $R1" || bad "first migrate result: $R1"
R2=$(q "select public.career_os_migrate_user('$UA');")
echo "$R2" | python3 -c "import sys,json;d=json.load(sys.stdin);assert d['opportunities']==0 and d['facts']==0,d" 2>/dev/null \
  && ok "second migrate is a no-op: $R2" || bad "second migrate result: $R2"
[ "$(q "select count(*) from public.opportunities where user_id='$UA';")" = "2" ] && ok "exactly 2 opportunities after two runs" || bad "duplicate opportunities"
FACTS=$(q "select count(*) from public.career_facts where user_id='$UA';")
R3=$(q "select public.career_os_migrate_user('$UA');")
[ "$(q "select count(*) from public.career_facts where user_id='$UA';")" = "$FACTS" ] && ok "third run adds no facts ($FACTS)" || bad "facts duplicated on rerun"
[ "$(q "select count(*) from public.career_migrations where user_id='$UA' and status='done';")" -ge 3 ] && ok "migration ledger rows recorded" || bad "ledger missing"
OPP=$(q "select opportunity_id from public.job_applications where id='$WISH';")
[ -n "$OPP" ] && [ "$(q "select count(*) from public.job_applications where id='$WISH' and user_id='$UA';")" = "1" ] \
  && ok "wishlist application keeps its id and now has opportunity_id=$OPP" || bad "wishlist application lost id or opportunity link"
[ "$(q "select id = public.career_os_uuid('opportunity:legacy','$WISH') from public.opportunities where id='$OPP';")" = "t" ] && ok "opportunity id is deterministic from the legacy application id" || bad "opportunity id not deterministic"
[ "$(q "select confirmation_state||'/'||review_state from public.career_facts where user_id='$UA' and kind='experience' limit 1;")" = "inferred/candidate" ] && ok "imported facts are inferred candidates, never verified" || bad "imported fact state wrong"

# --- Idempotent start (PostgREST RPC with the user JWT) ---------------------------
START1=$(rest POST "rpc/career_start_application" "$TA" "{\"p_opportunity_id\":\"$OPP\"}")
ID1=$(echo "$START1" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('id',''))" 2>/dev/null)
ST1=$(echo "$START1" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('stage',''),d.get('status',''),d.get('attempt_no',''))" 2>/dev/null)
[ "$ID1" = "$WISH" ] && ok "start activates the same wishlist application ($ST1)" || bad "start returned '$ID1' expected $WISH: $(echo "$START1" | head -c200)"
[ "$ST1" = "preparing wishlist 1" ] && ok "stage=preparing, legacy status stays wishlist" || bad "stage/status after start: $ST1"
START2=$(rest POST "rpc/career_start_application" "$TA" "{\"p_opportunity_id\":\"$OPP\"}")
ID2=$(echo "$START2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ "$ID2" = "$ID1" ] && ok "second start returns the same application id" || bad "second start created '$ID2'"
[ "$(q "select count(*) from public.job_applications where user_id='$UA' and opportunity_id='$OPP';")" = "1" ] && ok "still one application for the opportunity" || bad "duplicate application"
REAPPLY=$(rest POST "rpc/career_start_application" "$TA" "{\"p_opportunity_id\":\"$OPP\",\"p_reapply\":true}")
RA=$(echo "$REAPPLY" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('attempt_no',''),d.get('previous_attempt_id',''))" 2>/dev/null)
[ "$RA" = "2 $ID1" ] && ok "reapply creates attempt 2 linked to attempt 1" || bad "reapply: $RA ($(echo "$REAPPLY" | head -c200))"
# B cannot start A's opportunity (same "not found" as a missing id).
XB=$(rest POST "rpc/career_start_application" "$TB" "{\"p_opportunity_id\":\"$OPP\"}")
echo "$XB" | grep -q "opportunity_not_found" && ok "B cannot start A's opportunity (opportunity_not_found)" || bad "cross-user start: $(echo "$XB" | head -c160)"

# --- Two-owner RLS ----------------------------------------------------------------
[ "$(rest GET "opportunities?select=id" "$TB" | jlen)" = "0" ] && ok "B sees none of A's opportunities" || bad "B can read A's opportunities"
[ "$(rest GET "career_facts?select=id" "$TB" | jlen)" = "0" ] && ok "B sees none of A's career_facts" || bad "B can read A's facts"
[ "$(rest GET "opportunities?select=id" "$TA" | jlen)" = "2" ] && ok "A sees its 2 opportunities" || bad "A cannot read own opportunities"
[ "$(rest GET "career_facts?select=id" "$TA" | jlen)" = "$FACTS" ] && ok "A sees its $FACTS facts" || bad "A cannot read own facts"
rest PATCH "opportunities?id=eq.$OPP" "$TB" '{"title":"hijacked"}' >/dev/null
[ "$(q "select title from public.opportunities where id='$OPP';")" != "hijacked" ] && ok "B cannot update A's opportunity" || bad "B updated A's opportunity"

# --- New-model write, then rollback read with the flag off ------------------------
rest PATCH "job_applications?id=eq.$APPL" "$TA" '{"stage":"interview"}' > "$TMP/p.json"
[ "$(q "select status||'/'||stage from public.job_applications where id='$APPL';")" = "interview/interview" ] && ok "stage write derives legacy status (interview)" || bad "stage write not mirrored: $(head -c160 "$TMP/p.json")"
FLAG_BEFORE=$(q "select enabled::text||','||rollout_pct from public.feature_flags where flag='career_os';")
psql "$PSQL" -tA -c "update public.feature_flags set enabled=false where flag='career_os';" >/dev/null
[ "$(q "select enabled from public.feature_flags where flag='career_os';")" = "f" ] && ok "career_os flag flipped off (was $FLAG_BEFORE)" || bad "could not flip flag"
rest GET "job_applications?select=id,status&order=created_at" "$TA" > "$TMP/legacy.json"
python3 - "$TMP/legacy.json" "$APPL" "$WISH" <<'PY' && ok "legacy tracker read: only the five legacy statuses; new writes visible (interview, wishlist, attempt 2)" || bad "legacy read check failed: $(head -c200 "$TMP/legacy.json")"
import json,sys
rows=json.load(open(sys.argv[1])); appl=sys.argv[2]; wish=sys.argv[3]
legacy={'wishlist','applied','interview','offer','rejected'}
assert isinstance(rows,list) and len(rows)==3, rows
assert all(r['status'] in legacy for r in rows), rows
assert next(r for r in rows if r['id']==appl)['status']=='interview', rows
assert next(r for r in rows if r['id']==wish)['status']=='wishlist', rows
PY
RECON=$(q "select public.career_os_reconcile_legacy('$UA');")
[ "$RECON" -ge 2 ] && ok "career_os_reconcile_legacy touched $RECON applications" || bad "reconcile returned $RECON"
[ "$(q "select status||'/'||stage from public.job_applications where id='$APPL';")" = "interview/interview" ] && ok "post-switch write survives rollback reconciliation" || bad "rollback lost the new write"
# Legacy write while the flag is off still keeps stage coherent.
rest PATCH "job_applications?id=eq.$APPL" "$TA" '{"status":"offer"}' >/dev/null
[ "$(q "select status||'/'||stage from public.job_applications where id='$APPL';")" = "offer/final" ] && ok "legacy status write during rollback derives stage=final" || bad "legacy write during rollback broke stage"
psql "$PSQL" -tA -c "update public.feature_flags set enabled=true where flag='career_os';" >/dev/null
[ "$(q "select enabled::text||','||rollout_pct from public.feature_flags where flag='career_os';")" = "$FLAG_BEFORE" ] && ok "career_os flag restored ($FLAG_BEFORE)" || bad "flag not restored"

psql "$PSQL" -tA -c "delete from auth.users where email in ('$A','$B');" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "CAREER OS MIGRATION SMOKE: ALL PASS" || echo "CAREER OS MIGRATION SMOKE: FAILURES PRESENT"
exit $fail
