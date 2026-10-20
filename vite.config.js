import { defineConfig } from 'vite';
import { resolve } from 'path';

// The live site only runs the game's own scripts: no inline or injected code (a doctored save code included), nothing from
// other sites. Build only, because the dev server needs its own live-reload script and socket.
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
const csp = { name: 'csp', apply: 'build', transformIndexHtml: (html) => html.replace('<head>', `<head>\n  <meta http-equiv="Content-Security-Policy" content="${CSP}" />`) };

export default defineConfig({
  base: './',
  plugins: [csp],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2019',
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), showcase: resolve(__dirname, 'showcase.html') } },
  },
});
