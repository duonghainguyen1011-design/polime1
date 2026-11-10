import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` makes the Netlify site; `--mode preview` makes a single self-contained HTML file.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'preview' ? [react(), viteSingleFile()] : [react()],
  build: { outDir: mode === 'preview' ? 'dist-preview' : 'dist' },
}));
