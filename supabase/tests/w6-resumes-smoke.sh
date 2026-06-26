#!/usr/bin/env bash
# W6 multi-resume happy-path smoke against the LOCAL Supabase stack.
#   bash supabase/tests/w6-resumes-smoke.sh
# Mirrors resumeRepo's create / duplicate / rename / remove against the resumes
# table: confirms several non-primary resumes coexist with the one primary
# (the partial unique index), a duplicate copies data, rename sticks, and delete
# decrements. Cross-user isolation is covered by w5-rls-audit.sh.
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"; PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
S=$(date +%s); fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
H=(-H "apikey: $ANON_KEY")

mkuser() {
  curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
  curl -s -X POST "$API/auth/v1/token?grant_type=password" "${H[@]}" \
    -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"test123456\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}
cnt() { curl -s "$API/rest/v1/resumes?select=id" "${H[@]}" -H "Authorization: Bearer $T" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"; }

psql "$PSQL" -tA -c "delete from auth.users where email like 'w6r%@example.com';" >/dev/null 2>&1 || true
E="w6r${S}@example.com"; T=$(mkuser "$E")
[ -n "$T" ] && ok "user + token" || { bad "no token (stack up?)"; exit 1; }
RUSER=$(psql "$PSQL" -tA -c "select id from auth.users where email='$E';")

# create primary + two extra (non-primary) resumes
curl -s -X POST "$API/rest/v1/resumes" "${H[@]}" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"user_id\":\"$RUSER\",\"title\":\"Primary\",\"is_primary\":true,\"data\":{\"skills\":[\"react\"]}}" > "$TMP/p.json"
PID=$(python3 -c "import sys,json;print(json.load(open('$TMP/p.json'))[0]['id'])")
curl -s -X POST "$API/rest/v1/resumes" "${H[@]}" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d "{\"user_id\":\"$RUSER\",\"title\":\"Untitled resume\",\"is_primary\":false,\"data\":{\"skills\":[\"go\"]}}" > "$TMP/c.json" -w '%{http_code}' -o /dev/null
C2=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/rest/v1/resumes" "${H[@]}" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d "{\"user_id\":\"$RUSER\",\"title\":\"Backend CV\",\"is_primary\":false,\"data\":{\"skills\":[\"rust\"]}}")
[ "$C2" = "201" ] && ok "extra non-primary resumes coexist with the primary (201)" || bad "create non-primary failed (http $C2)"
[ "$(cnt)" = "3" ] && ok "count() = 3 after creates" || bad "count mismatch: $(cnt)"

# duplicate the primary (repo: GET src, INSERT copy with same data + '(copy)')
SRC=$(curl -s "$API/rest/v1/resumes?id=eq.$PID&select=title,data,template_id,visible_sections" "${H[@]}" -H "Authorization: Bearer $T")
DUP=$(python3 -c "import sys,json;s=json.load(sys.stdin)[0];print(json.dumps({'user_id':'$RUSER','is_primary':False,'title':s['title']+' (copy)','data':s['data'],'template_id':s['template_id'],'visible_sections':s['visible_sections']}))" <<<"$SRC")
curl -s -X POST "$API/rest/v1/resumes" "${H[@]}" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "$DUP" > "$TMP/d.json"
DTITLE=$(python3 -c "import sys,json;d=json.load(open('$TMP/d.json'))[0];print(d['title']+'|'+','.join(d['data']['skills']))")
[ "$DTITLE" = "Primary (copy)|react" ] && ok "duplicate copies title+data ($DTITLE)" || bad "duplicate mismatch: '$DTITLE'"

# rename the duplicate
DID=$(python3 -c "import sys,json;print(json.load(open('$TMP/d.json'))[0]['id'])")
curl -s -X PATCH "$API/rest/v1/resumes?id=eq.$DID" "${H[@]}" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{"title":"Tailored — Acme"}' >/dev/null
[ "$(psql "$PSQL" -tA -c "select title from public.resumes where id='$DID';")" = "Tailored — Acme" ] && ok "rename persists" || bad "rename failed"

# delete the duplicate
curl -s -X DELETE "$API/rest/v1/resumes?id=eq.$DID" "${H[@]}" -H "Authorization: Bearer $T" >/dev/null
[ "$(cnt)" = "3" ] && ok "remove() decrements back to 3" || bad "remove mismatch: $(cnt)"

psql "$PSQL" -tA -c "delete from auth.users where email='$E';" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "W6 RESUMES SMOKE: ALL PASS" || echo "W6 RESUMES SMOKE: FAILURES PRESENT"
exit $fail
