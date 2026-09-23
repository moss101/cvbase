#!/usr/bin/env bash
# Source this file to run the supabase/tests/*.sh smoke scripts on a machine
# without `supabase` or `psql` binaries on PATH:
#   source scripts/career-os-local-env.sh && bash supabase/tests/w2-rls-smoke.sh
# scripts/local-bin/supabase resolves to the npx-installed CLI and
# scripts/local-bin/psql runs inside the local database container. Local
# development only; never points at a hosted project.
export PATH="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)/local-bin:$PATH"
