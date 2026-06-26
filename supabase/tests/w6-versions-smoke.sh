#!/usr/bin/env bash
# W6 version-manager happy-path smoke against the LOCAL Supabase stack.
#   bash supabase/tests/w6-versions-smoke.sh
# A user snapshots a version of their own resume, lists it, reads the snapshot
# data back (restore), and deletes it — the resume_versions ops the UI performs.
# (Cross-user isolation for this table is covered by w5-rls-audit.sh.)
set -u
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)" || exit 1
eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
API="http://127.0.0.1:54321"
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
S=$(date +%s); fail=0
ok()  { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

mkuser() {
  curl -s -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"test123456\",\"email_confirm\":true}" >/dev/null
  curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"test123456\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}

psql "$PSQL" -tA -c "delete from auth.users where email like 'w6v%@example.com';" >/dev/null 2>&1 || true
E="w6v${S}@example.com"; T=$(mkuser "$E")
[ -n "$T" ] && ok "user + token" || { bad "no token (is the stack up?)"; exit 1; }
RUSER=$(psql "$PSQL" -tA -c "select id from auth.users where email='$E';")

# Create a resume to attach versions to.
curl -s -X POST "$API/rest/v1/resumes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"user_id\":\"$RUSER\",\"title\":\"Main\",\"is_primary\":true,\"data\":{\"skills\":[\"react\"]}}" > "$TMP/r.json"
RID=$(python3 -c "import sys,json;print(json.load(open('$TMP/r.json'))[0]['id'])")

# Snapshot a version (as versionRepo.snapshot does).
curl -s -X POST "$API/rest/v1/resume_versions" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"user_id\":\"$RUSER\",\"resume_id\":\"$RID\",\"label\":\"Before tailoring\",\"data\":{\"skills\":[\"react\",\"go\"]}}" > "$TMP/v.json"
VID=$(python3 -c "import sys,json;print(json.load(open('$TMP/v.json'))[0]['id'])" 2>/dev/null || echo '')
[ -n "$VID" ] && ok "snapshot created (id=$VID)" || bad "snapshot insert failed: $(head -c160 "$TMP/v.json")"

# List versions for the resume.
LBL=$(curl -s "$API/rest/v1/resume_versions?resume_id=eq.$RID&select=label,data&order=created_at.desc" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d), d[0]['label'] if d else '')")
[ "$LBL" = "1 Before tailoring" ] && ok "listForResume returns the snapshot ($LBL)" || bad "list mismatch: '$LBL'"

# Restore = read the snapshot data back.
DATA=$(curl -s "$API/rest/v1/resume_versions?id=eq.$VID&select=data" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" | python3 -c "import sys,json;print(','.join(json.load(sys.stdin)[0]['data']['skills']))")
[ "$DATA" = "react,go" ] && ok "restore reads back snapshot data (skills=$DATA)" || bad "restore data mismatch: '$DATA'"

# Delete the version.
curl -s -X DELETE "$API/rest/v1/resume_versions?id=eq.$VID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $T" >/dev/null
[ "$(psql "$PSQL" -tA -c "select count(*) from public.resume_versions where id='$VID';")" = "0" ] && ok "delete removes the version" || bad "delete did not remove the version"

psql "$PSQL" -tA -c "delete from auth.users where email='$E';" >/dev/null
echo "----"
[ "$fail" = "0" ] && echo "W6 VERSIONS SMOKE: ALL PASS" || echo "W6 VERSIONS SMOKE: FAILURES PRESENT"
exit $fail
