import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (
              id.includes('@tiptap') ||
              id.includes('yjs') ||
              id.includes('prismjs') ||
              id.includes('katex') ||
              id.includes('dompurify') ||
              id.includes('jszip') ||
              id.includes('@dnd-kit')
            ) {
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
