import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Plugin to handle API routes in development
function apiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            // Parse and validate request body
            const parsedBody = JSON.parse(body);
            const { prompt, systemContext } = parsedBody;

            if (!prompt) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ error: 'Missing prompt in request body' }));
              return;
            }

            // Get API key from environment (check multiple sources for compatibility)
            const apiKey = env.OPENAI_API_KEY || 
                          env.VITE_OPENAI_API_KEY ||
                          process.env.OPENAI_API_KEY ||
                          process.env.VITE_OPENAI_API_KEY;

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ 
                error: 'Server key not configured. Please set OPENAI_API_KEY or VITE_OPENAI_API_KEY in your .env file.' 
              }));
              return;
            }

            // Build messages array for OpenAI
            const messages: Array<{ role: string; content: string }> = [];
            if (systemContext) {
              messages.push({ role: 'system', content: systemContext });
            }
            messages.push({ role: 'user', content: prompt });

            // Call OpenAI API
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages
              })
            });

            const data = await openaiResponse.json() as any;
            
            if (!openaiResponse.ok) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ 
                error: data.error?.message || 'Failed to call OpenAI'
              }));
              return;
            }

            if (!data.choices?.[0]?.message?.content) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ error: 'Unexpected response format from OpenAI' }));
              return;
            }

            // Return successful response
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ content: data.choices[0].message.content }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ 
              error: error.message || 'Internal server error'
            }));
          }
        });

        req.on('error', (error) => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: 'Request error: ' + error.message }));
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env file
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react(), apiPlugin(env)],
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
  };
})
