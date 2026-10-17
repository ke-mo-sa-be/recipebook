/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Env vars exposed to the browser must start with VITE_. Never put a secret in one.
  envPrefix: 'VITE_',
  envDir: '../..',
  build: { target: 'es2022', sourcemap: true },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Dummy public config so modules that read env can load; tests never reach a real server.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only_000000000',
      VITE_SITE_URL: 'http://localhost:5173',
    },
  },
});
