import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'], // importantissimo per evitare doppie copie
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    hmr: { overlay: true },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: { target: 'es2020' },
  },
});
