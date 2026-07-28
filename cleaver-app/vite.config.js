import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En producción la app se sirve montada bajo /cleaver/ desde el servidor
// Express del proyecto (DISC/IPV); en desarrollo se sirve en la raíz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cleaver/' : '/',
  plugins: [react()],
  server: { port: 5173, open: true },
}));
