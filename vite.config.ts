import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split vendor libraries and large modules into separate chunks
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // React and related
          if (id.includes('react')) return 'vendor_react';

          // Split Firebase into smaller service-specific chunks
          if (id.includes('/firebase/') || id.includes('firebase')) {
            if (id.includes('firebase/auth')) return 'firebase_auth';
            if (id.includes('firebase/firestore')) return 'firebase_firestore';
            if (id.includes('firebase/analytics')) return 'firebase_analytics';
            return 'firebase_core';
          }

          if (id.includes('openai')) return 'vendor_openai';
          return 'vendor_misc';
        }
      }
    }
  }
})
