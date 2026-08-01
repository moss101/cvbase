import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Minimal .env parser for the canonical (custom-named) secret file
 * `.env.cvbase.local`, which Vite's `loadEnv` does not pick up automatically.
 * Values in that file may carry leading spaces / surrounding quotes — trim both.
 */
function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export default defineConfig(({ mode }) => {
  // Standard files (.env, .env.local, …) then the canonical secret file on top.
  const env = {
    ...loadEnv(mode, '.', ''),
    ...parseEnvFile(path.resolve('.env.cvbase.local')),
  };

  // Resolve a client-safe var by either its VITE_-prefixed or bare name.
  // SECURITY: only these three client-safe values are ever read into `define`.
  // Server secrets (service role key, Stripe secret, Gemini key, DB password)
  // are never referenced here and therefore can never reach the browser bundle.
  const clientVar = (name: string): string => env[`VITE_${name}`] ?? env[name] ?? '';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(clientVar('SUPABASE_URL')),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(clientVar('SUPABASE_ANON_KEY')),
      'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(
        clientVar('STRIPE_PUBLISHABLE_KEY'),
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          /**
           * Splits the vendor libraries that dominate the bundle. This matters
           * most on mobile cold start: the rich-text editor, document export and
           * PDF stacks are only needed once a user opens the builder, so keeping
           * them out of the entry chunk lets the landing page and dashboard paint
           * from a much smaller payload.
           */
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor';
            if (id.includes('pdfjs-dist')) return 'pdfjs';
            if (id.includes('docx') || id.includes('mammoth')) return 'documents';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('react-dom') || id.includes('scheduler')) return 'react';
            return undefined;
          },
        },
      },
      // The pdf.js worker and icon font legitimately exceed the default warning
      // threshold, so raise it enough that oversized JS still stands out.
      chunkSizeWarningLimit: 900,
    },
  };
});
