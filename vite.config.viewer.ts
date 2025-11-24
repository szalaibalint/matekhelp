import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { Plugin } from 'vite';
import fs from 'fs';

// Plugin to serve viewer.html as index
const serveViewerHtml = (): Plugin => ({
  name: 'serve-viewer-html',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/' || req.url === '/index.html') {
        req.url = '/viewer.html';
      }
      next();
    });
  },
});

// Plugin to rename viewer.html to index.html after build
const renameViewerToIndex = (): Plugin => ({
  name: 'rename-viewer-to-index',
  closeBundle() {
    const viewerPath = path.resolve(__dirname, 'dist/viewer/viewer.html');
    const indexPath = path.resolve(__dirname, 'dist/viewer/index.html');
    
    if (fs.existsSync(viewerPath)) {
      fs.renameSync(viewerPath, indexPath);
      console.log('✓ Renamed viewer.html to index.html');
    }
  },
});

// Viewer configuration
export default defineConfig({
  base: process.env.NODE_ENV === "development" ? "/" : process.env.VITE_BASE_PATH || "/",
  optimizeDeps: {
    entries: ["src/viewer-main.tsx"],
  },
  plugins: [
    react(),
    serveViewerHtml(),
    renameViewerToIndex(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    // @ts-ignore
    allowedHosts: true,
  },
  build: {
    outDir: 'dist/viewer',
    rollupOptions: {
      input: {
        viewer: path.resolve(__dirname, "viewer.html"),
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
        }
      }
    },
  },
});
