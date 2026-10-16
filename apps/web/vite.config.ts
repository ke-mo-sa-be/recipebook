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
  },
});
