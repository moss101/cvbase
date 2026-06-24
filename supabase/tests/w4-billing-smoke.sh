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

if [ -n "$WHSEC" ]; then
  post(){ local ts sig; ts=$(date +%s); sig=$(python3 -c "import hmac,hashlib;p=open('$1','rb').read();print(hmac.new(b'$WHSEC', b'$ts.'+p, hashlib.sha256).hexdigest())"); curl -s -o /dev/null -w "%{http_code}" --max-time 60 -X POST "$API/functions/v1/stripe-webhook" -H "Content-Type: application/json" -H "Stripe-Signature: t=$ts,v1=$sig" --data-binary @"$1"; }

  python3 -c "import json;open('/tmp/w4a.json','w').write(json.dumps({'type':'checkout.session.completed','data':{'object':{'client_reference_id':'$UID','customer':'cus_smoke','subscription':'sub_smoke','metadata':{'user_id':'$UID','plan_id':'pro','cycle':'monthly'}}}}))"
  post /tmp/w4a.json >/dev/null
  [ "$(psql "$PSQL" -tA -c "select plan_id||'/'||status from subscriptions where user_id='$UID';")" = "pro/active" ] && ok "webhook upgrades subscription to pro/active" || bad "webhook did not set pro/active"
  [ "$(linkedin)" != "403" ] && ok "after purchase: ai-linkedin UNLOCKED (entitlement flipped)" || bad "still gated after purchase"

  python3 -c "import json;open('/tmp/w4b.json','w').write(json.dumps({'type':'customer.subscription.deleted','data':{'object':{'id':'sub_smoke','customer':'cus_smoke','status':'canceled','metadata':{'user_id':'$UID'}}}}))"
  post /tmp/w4b.json >/dev/null
  [ "$(psql "$PSQL" -tA -c "select plan_id from subscriptions where user_id='$UID';")" = "free" ] && ok "cancel reverts subscription to free" || bad "cancel did not revert to free"
  [ "$(linkedin)" = "403" ] && ok "after cancel: ai-linkedin re-locked (403)" || bad "not re-locked after cancel"
else
  echo "SKIP: STRIPE_WEBHOOK_SECRET empty — set it (stripe listen) to test the reducer + entitlement flip"
fi

psql "$PSQL" -tA -c "delete from auth.users where email='$E';" >/dev/null
echo "----"; [ "$fail" = "0" ] && echo "W4 BILLING SMOKE: ALL PASS" || echo "W4 BILLING SMOKE: FAILURES"
exit $fail
