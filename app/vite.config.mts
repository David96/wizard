import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Serve & build the site under /wizard (was: "homepage" in package.json)
export default defineConfig({
  base: '/wizard/',
  plugins: [react()],
  server: { port: 3000 },
});
