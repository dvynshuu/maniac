import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tiptap') || id.includes('yjs')) {
              return 'editor-vendor';
            }
            if (id.includes('react-force-graph-2d') || id.includes('d3')) {
              return 'graph-vendor';
            }
            if (id.includes('dexie')) {
              return 'db-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});
