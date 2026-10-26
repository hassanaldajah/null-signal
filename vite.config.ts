import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Single source of truth for HTTP security headers:
// applied by `vite preview` (so the browser check runs under them) and written to
// dist/_headers for Cloudflare Pages.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'", // Draco decoder is WebAssembly
  "worker-src 'self' blob:", // Draco runs in a blob worker
  "style-src 'self' 'unsafe-inline'", // xterm.js injects its theme <style>
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site', // other sites cannot embed the game's files; al-hassan.dev still can
};

function cloudflareHeaders(): Plugin {
  return {
    name: 'cloudflare-security-headers',
    apply: 'build',
    generateBundle() {
      const all = { ...SECURITY_HEADERS, 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' };
      const lines = ['/*', ...Object.entries(all).map(([key, value]) => `  ${key}: ${value}`), '', '/assets/*', '  Cache-Control: public, max-age=31536000, immutable', ''];
      this.emitFile({ type: 'asset', fileName: '_headers', source: lines.join('\n') });
    },
  };
}

export default defineConfig({
  plugins: [react(), cloudflareHeaders()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, headers: SECURITY_HEADERS },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    // Keep fonts as files: inlined data: fonts would need a looser CSP (font-src data:).
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
  },
});
