import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dweepa/' : '/',
  server: { port: 5173, host: true },
}));
