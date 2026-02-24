import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function dbProxyPlugin() {
  let serviceRoleKey = '';
  let supabaseUrl = '';

  return {
    name: 'db-proxy',
    configResolved() {
      const env = loadEnv('', process.cwd(), '');
      serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
      supabaseUrl = env.VITE_SUPABASE_URL || '';
    },

    configureServer: setupMiddleware,
    configurePreviewServer: setupMiddleware,
  };

  function setupMiddleware(server) {
    server.middlewares.use('/api/db', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.end(); return; }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { path, method = 'GET', data } = JSON.parse(body);
          if (!serviceRoleKey) { res.statusCode = 500; res.end('{"error":"No service key"}'); return; }

          const opts = {
            method,
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          };
          if (method === 'PATCH' || method === 'POST') opts.headers['Prefer'] = 'return=representation';
          if (data) opts.body = JSON.stringify(data);

          const resp = await fetch(`${supabaseUrl}/rest/v1/${path}`, opts);
          const text = await resp.text();
          res.statusCode = resp.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(text);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    });

    server.middlewares.use('/api/team-lookup', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.end(); return; }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { code } = JSON.parse(body);
          const resp = await fetch(
            `${supabaseUrl}/rest/v1/teams?team_code=eq.${encodeURIComponent(code.trim())}&select=*`,
            { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Accept': 'application/json' } }
          );
          const arr = await resp.json();
          const team = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ team }));
        } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
      });
    });
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), dbProxyPlugin()],
})
