#!/usr/bin/env bash
# W4 billing smoke: proves the billing -> entitlement loop end to end against the
# live stack, using self-signed Stripe events (so it needs no Stripe CLI).
#   supabase start
#   supabase functions serve --env-file .env.cvbase.local --no-verify-jwt &
#   bash supabase/tests/w4-billing-smoke.sh
# Needs sk_test STRIPE_SECRET_KEY + a STRIPE_WEBHOOK_SECRET in .env.cvbase.local
# (any value locally — the smoke signs events with it). GEMINI_API_KEY is used
# only to tell a 403 (locked) apart from a non-403 (unlocked) on ai-linkedin.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
API="http://127.0.0.1:54321"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
WHSEC=$(grep -E '^STRIPE_WEBHOOK_SECRET=' .env.cvbase.local | cut -d= -f2- | tr -d ' ')
fail=0; ok(){ echo "PASS: $1"; }; bad(){ echo "FAIL: $1"; fail=1; }

E="w4smoke$(date +%s)@example.com"
curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$E\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
UID=$(psql "$PSQL" -tA -c "select id from auth.users where email='$E';")
T=$(curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$E\",\"password\":\"test123456\"}" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))")

code(){ curl -s -o /dev/null -w "%{http_code}" --max-time 120 -X POST "$API/functions/v1/$1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d "$2"; }
linkedin(){ code ai-linkedin '{"targetRole":"RN","headline":"x","about":"y"}'; }

# warm + free user is gated out of Smart Studio
for i in $(seq 1 10); do c=$(linkedin); [ "$c" != "000" ] && break; sleep 2; done
[ "$(linkedin)" = "403" ] && ok "free user: ai-linkedin gated (403)" || bad "free ai-linkedin not 403"

# checkout starts a real test session + stores the customer
R=$(curl -s --max-time 90 -X POST "$API/functions/v1/stripe-checkout" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{"planId":"pro","cycle":"monthly"}')
echo "$R" | grep -q 'checkout.stripe.com' && ok "stripe-checkout returns a test Checkout URL" || bad "checkout: ${R:0:120}"

# client cannot write subscriptions (RLS: only the service_role webhook writes)
before=$(psql "$PSQL" -tA -c "select coalesce(plan_id,'none') from subscriptions where user_id='$UID';")
curl -s -o /dev/null -X PATCH "$API/rest/v1/subscriptions?user_id=eq.$UID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"plan_id":"elite"}'
after=$(psql "$PSQL" -tA -c "select coalesce(plan_id,'none') from subscriptions where user_id='$UID';")
[ "$before" = "$after" ] && ok "client cannot self-upgrade via RLS ($before unchanged)" || bad "RLS let client change plan: $before -> $after"

# server-side resume limit: a free user gets exactly one resume (trigger resumes_enforce_limit)
ins(){ curl -s -o "$2" -w "%{http_code}" -X POST "$API/rest/v1/resumes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d "{\"user_id\":\"$UID\",\"title\":\"$1\"}"; }
[ "$(ins one /tmp/w4r1.txt)" = "201" ] && ok "free user: first resume insert allowed" || bad "first resume insert refused: $(cat /tmp/w4r1.txt)"
c=$(ins two /tmp/w4r2.txt); grep -q resume_limit_reached /tmp/w4r2.txt && [ "$c" = "400" ] && ok "free user: second resume refused with resume_limit_reached" || bad "second resume: http $c $(cat /tmp/w4r2.txt | head -c 160)"

if [ -n "$WHSEC" ]; then
  NOW=$(date +%s); PRICE=$(python3 -c "import json;print(json.load(open('config/stripe-prices.json'))['pro:monthly'])")
  # post <file> -> http code; body saved to /tmp/w4resp.json
  post(){ local ts sig; ts=$(date +%s); sig=$(python3 -c "import hmac,hashlib;p=open('$1','rb').read();print(hmac.new(b'$WHSEC', b'$ts.'+p, hashlib.sha256).hexdigest())"); curl -s -o /tmp/w4resp.json -w "%{http_code}" --max-time 60 -X POST "$API/functions/v1/stripe-webhook" -H "Content-Type: application/json" -H "Stripe-Signature: t=$ts,v1=$sig" --data-binary @"$1"; }
  # ev <file> <id> <created> <type> <object-json>
  ev(){ python3 -c "import json,sys;open('$1','w').write(json.dumps({'id':'$2','created':int('$3'),'type':'$4','data':{'object':json.loads(sys.argv[1])}}))" "$5"; }
  substate(){ psql "$PSQL" -tA -c "select plan_id||'/'||status||'/'||coalesce(stripe_event_created::text,'-') from subscriptions where user_id='$UID';"; }

  ev /tmp/w4a.json "evt_smoke_a_$NOW" "$NOW" checkout.session.completed "{\"client_reference_id\":\"$UID\",\"customer\":\"cus_smoke\",\"subscription\":\"sub_smoke\",\"metadata\":{\"user_id\":\"$UID\",\"plan_id\":\"pro\",\"cycle\":\"monthly\"}}"
  [ "$(post /tmp/w4a.json)" = "200" ] && [ "$(substate)" = "pro/active/$NOW" ] && ok "webhook upgrades subscription to pro/active (event_created recorded)" || bad "webhook did not set pro/active: $(substate) $(cat /tmp/w4resp.json)"
  [ "$(linkedin)" != "403" ] && ok "after purchase: ai-linkedin UNLOCKED (entitlement flipped)" || bad "still gated after purchase"

  # idempotency: the same event id delivered twice is acknowledged, not re-applied
  c=$(post /tmp/w4a.json); grep -q '"duplicate":true' /tmp/w4resp.json && [ "$c" = "200" ] && ok "duplicate delivery -> 200 {duplicate:true}" || bad "duplicate delivery: http $c $(cat /tmp/w4resp.json)"
  [ "$(psql "$PSQL" -tA -c "select count(*) from stripe_events where id='evt_smoke_a_$NOW' and processed_at is not null;")" = "1" ] && ok "stripe_events ledger row marked processed" || bad "stripe_events row missing/unprocessed"

  # dunning: payment_failed -> past_due (plan kept, grace); invoice.paid -> active again
  ev /tmp/w4f.json "evt_smoke_f_$NOW" "$((NOW+1))" invoice.payment_failed "{\"customer\":\"cus_smoke\",\"subscription\":\"sub_smoke\",\"subscription_details\":{\"metadata\":{\"user_id\":\"$UID\"}},\"lines\":{\"data\":[]}}"
  post /tmp/w4f.json >/dev/null
  [ "$(substate)" = "pro/past_due/$((NOW+1))" ] && ok "invoice.payment_failed -> pro/past_due" || bad "payment_failed: $(substate)"
  ev /tmp/w4p.json "evt_smoke_p_$NOW" "$((NOW+2))" invoice.paid "{\"customer\":\"cus_smoke\",\"subscription\":\"sub_smoke\",\"lines\":{\"data\":[{\"period\":{\"start\":$NOW,\"end\":$((NOW+2592000))}}]}}"
  post /tmp/w4p.json >/dev/null
  [ "$(substate)" = "pro/active/$((NOW+2))" ] && ok "invoice.paid (user resolved via stripe_customer_id) -> pro/active" || bad "invoice.paid: $(substate)"
  [ -n "$(psql "$PSQL" -tA -c "select current_period_end from subscriptions where user_id='$UID' and current_period_end is not null;")" ] && ok "invoice.paid refreshed current_period_end" || bad "period end not refreshed"

  ev /tmp/w4b.json "evt_smoke_b_$NOW" "$((NOW+3))" customer.subscription.deleted "{\"id\":\"sub_smoke\",\"customer\":\"cus_smoke\",\"status\":\"canceled\",\"metadata\":{\"user_id\":\"$UID\"}}"
  post /tmp/w4b.json >/dev/null
  [ "$(substate)" = "free/canceled/$((NOW+3))" ] && ok "cancel reverts subscription to free" || bad "cancel did not revert to free: $(substate)"
  [ "$(linkedin)" = "403" ] && ok "after cancel: ai-linkedin re-locked (403)" || bad "not re-locked after cancel"

  # out-of-order: a stale 'updated' (created before the delete) must not resurrect the plan
  ev /tmp/w4s.json "evt_smoke_s_$NOW" "$((NOW-100))" customer.subscription.updated "{\"id\":\"sub_smoke\",\"customer\":\"cus_smoke\",\"status\":\"active\",\"items\":{\"data\":[{\"price\":{\"id\":\"$PRICE\"}}]},\"metadata\":{\"user_id\":\"$UID\"}}"
  c=$(post /tmp/w4s.json); grep -q '"stale":true' /tmp/w4resp.json && [ "$c" = "200" ] && [ "$(substate)" = "free/canceled/$((NOW+3))" ] && ok "out-of-order stale update ignored -> 200 {stale:true}, still free" || bad "stale update: http $c $(cat /tmp/w4resp.json) state=$(substate)"

  psql "$PSQL" -tA -c "delete from stripe_events where id like 'evt_smoke_%_$NOW';" >/dev/null
else
  echo "SKIP: STRIPE_WEBHOOK_SECRET empty — set it (stripe listen) to test the reducer + entitlement flip"
fi

psql "$PSQL" -tA -c "delete from auth.users where email='$E';" >/dev/null
echo "----"; [ "$fail" = "0" ] && echo "W4 BILLING SMOKE: ALL PASS" || echo "W4 BILLING SMOKE: FAILURES"
exit $fail
