import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En producción la app se sirve montada bajo /cleaver/ desde el servidor
// Express del proyecto (DISC/IPV); en desarrollo se sirve en la raíz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cleaver/' : '/',
  plugins: [react()],
  // En desarrollo, la API vive en el servidor Express (puerto 3000). Este proxy
  // permite que `npm run dev` (puerto 5173) llame a /api/... sin CORS.
  server: {
    port: 5173,
    open: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
}));
