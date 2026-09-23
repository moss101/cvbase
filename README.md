<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

Career OS planning: start with [PRD.md](PRD.md), [tasks.md](tasks.md), and the [architecture and dependency graphs](docs/career-os/GRAPHS.md). The [current product map](docs/career-os/CURRENT_PRODUCT_MAP.md) records what already exists and what still needs implementation.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/63b9cb4c-bbb8-4598-be41-accea93091f9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.cvbase.local` and fill in the client-safe values
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`). Server-only
   secrets (Gemini key, Stripe secret, Supabase service-role key) are **not**
   bundled into the app — they live in Supabase Edge Function secrets
   (see [`supabase/README.md`](supabase/README.md)).
3. Run the app:
   `npm run dev`

### Career OS (the new six-space app) locally

`npm run dev` talks to the Supabase project in `.env.cvbase.local`. The Career OS
screens need the `20260920100000_career_os_foundation` migration and the
`career_os` feature flag; until that migration is applied to your hosted project,
the app there correctly falls back to the classic dashboard. To see Career OS
now, run it against a local Supabase stack (Docker required):

1. `npx supabase@latest start -x studio,logflare,vector,imgproxy,pooler,supavisor`
   (applies every migration and `supabase/seed.sql`, which switches `career_os` on for 100%).
2. Create `.env.cvbase.localstack` with `SUPABASE_URL=http://127.0.0.1:54321`, the local
   `SUPABASE_ANON_KEY` from `npx supabase@latest status -o env`, and any `STRIPE_PUBLISHABLE_KEY`.
3. `npm run dev:local`, then open http://localhost:3000/app/today.

Signed out, you get the guest version (CV builder, templates, ATS checker, Smart Studio,
resources). Sign-in codes arrive in the local mail catcher at http://127.0.0.1:54324.
Signed-out visitors only see Career OS where the flag is rolled out to 100%.
