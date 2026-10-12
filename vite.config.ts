import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = fileURLToPath(new URL('.', import.meta.url));

// Hosts allowed to reach the dev/preview server through a Cloudflare Tunnel.
// A leading dot matches all subdomains. Add a named tunnel's custom domain here.
const tunnelHosts = ['.trycloudflare.com'];

export default defineConfig({
  server: {
    // Listen on all interfaces (IPv4 + IPv6) so cloudflared can reach it via localhost or 127.0.0.1.
    host: true,
    port: 5173,
    // Fail instead of silently moving to another port the tunnel isn't pointed at.
    strictPort: true,
    allowedHosts: tunnelHosts,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: tunnelHosts,
  },
  build: {
    target: 'es2022',
    // three.js (~150 kB gzip) is loaded lazily, only when a 3D scene nears the viewport.
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        main: resolve(configDirectory, 'index.html'),
        notFound: resolve(configDirectory, '404.html'),
      },
    },
  },
});
