import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const currentDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  if (command === 'build') {
    process.env.NODE_ENV = 'production';
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(currentDir, 'index.html'),
          global: path.resolve(currentDir, 'global/index.html'),
          calendar: path.resolve(currentDir, 'calendar/index.html'),
          calculator: path.resolve(currentDir, 'calculator/index.html'),
          insights: path.resolve(currentDir, 'insights/index.html'),
          about: path.resolve(currentDir, 'about/index.html'),
          methodology: path.resolve(currentDir, 'methodology/index.html'),
          contact: path.resolve(currentDir, 'contact/index.html'),
          privacy: path.resolve(currentDir, 'privacy/index.html'),
          admin: path.resolve(currentDir, 'admin/index.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
