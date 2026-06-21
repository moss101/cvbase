// Node < 22 has no native WebSocket, but @supabase/realtime-js requires one at
// createClient() time. Polyfill it for the Node test environment only — the
// browser build uses the platform's native WebSocket and never imports `ws`.
import ws from 'ws';

if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
  (globalThis as { WebSocket?: unknown }).WebSocket = ws;
}
