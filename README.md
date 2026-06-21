<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

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
