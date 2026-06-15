import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server runs on 5173 (matches FRONTEND_URL the backend expects for CORS / postMessage).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
