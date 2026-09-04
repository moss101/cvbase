import Stripe from 'npm:stripe@^17';

// Stripe client for the Deno edge runtime: must use the Fetch HTTP client and
// the SubtleCrypto provider (Node's http/crypto are unavailable here).
export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2025-02-24.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

/** Async-capable crypto provider for webhook signature verification in Deno. */
export const cryptoProvider = Stripe.createSubtleCryptoProvider();
