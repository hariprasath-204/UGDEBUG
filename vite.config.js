import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import axios from 'axios'

const ONLINE_COMPILER_KEYS = [
  "a6ed2c1539a350079a242c2c2deecc36",
  "ccb79ad09699924cb025d0ba0b6690ed",
  "8471946023c357608b7666f763b66d9e",
  "00f2e3686a1712e01b8fa42d4ff76635",
  "31f89d72d1ae6013e4925c06bac75502"
];

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        
        // 1. Time Endpoint
        if (url.startsWith('/api/time')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.end(JSON.stringify({ now: Date.now() }));
          return;
        }

        // 2. Count Endpoint
        if (url.startsWith('/api/onlinecompiler/count') || url.startsWith('/api/compiler/count')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            let customKeys = [];
            try { 
              if (body) {
                const parsed = JSON.parse(body);
                customKeys = Array.isArray(parsed.keys) ? parsed.keys : [];
              }
            } catch(e){}

            const rawCustom = customKeys.map(k => (typeof k === 'string' ? k.trim() : (k?.apiKey || k?.key || '')).trim()).filter(Boolean);
            const allUnique = [...new Set([...ONLINE_COMPILER_KEYS, ...rawCustom])];
            const all = allUnique.map(k => ({
              apiKey: k,
              status: 'active',
              used: 0,
              errorReason: null
            }));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              totalCount: all.length,
              active: all,
              exhausted: [],
              all
            }));
          });
          return;
        }

        // 3. Status Endpoint
        if (url.startsWith('/api/onlinecompiler/status') || url.startsWith('/api/compiler/status')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            let customKeys = [];
            try { 
              if (body) {
                const parsed = JSON.parse(body);
                customKeys = Array.isArray(parsed.keys) ? parsed.keys : [];
              }
            } catch(e){}

            const rawCustom = customKeys.map(k => (typeof k === 'string' ? k.trim() : (k?.apiKey || k?.key || '')).trim()).filter(Boolean);
            const allKeys = [...new Set([...ONLINE_COMPILER_KEYS, ...rawCustom])];
            
            const results = [];
            for (const key of allKeys) {
              let status = 'active';
              let errorReason = null;

              for (let attempt = 0; attempt < 2; attempt++) {
                try {
                  const resp = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', {
                    compiler: 'g++-15',
                    code: 'int main(){return 0;}',
                    input: ''
                  }, {
                    timeout: 9000,
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': key,
                      'ApiKey': key
                    }
                  });

                  const errCheck = ((resp.data?.error || '') + ' ' + (resp.data?.message || '')).toLowerCase();
                  if (errCheck.includes('concurrent') || errCheck.includes('too many')) {
                    await new Promise(r => setTimeout(r, 350));
                    continue;
                  }

                  if (
                    resp.status === 401 || resp.status === 403 ||
                    errCheck.includes('limit exceeded') || errCheck.includes('quota') || errCheck.includes('daily limit') ||
                    errCheck.includes('invalid api key') || errCheck.includes('unauthorized')
                  ) {
                    status = 'exhausted';
                    errorReason = resp.data?.error || resp.data?.message || 'Quota Limit Exceeded';
                  } else {
                    status = 'active';
                    errorReason = null;
                  }
                  break;
                } catch(err) {
                  const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || '';
                  const errStatus = err?.response?.status;
                  const errCheck = errMsg.toLowerCase();

                  if (errCheck.includes('concurrent') || errCheck.includes('too many')) {
                    await new Promise(r => setTimeout(r, 350));
                    continue;
                  }

                  if (errStatus === 401 || errStatus === 403 || errCheck.includes('limit exceeded') || errCheck.includes('quota') || errCheck.includes('daily limit')) {
                    status = 'exhausted';
                    errorReason = errMsg || `HTTP ${errStatus} Quota Limit`;
                  } else {
                    status = 'active';
                    errorReason = null;
                  }
                  break;
                }
              }

              results.push({ apiKey: key, status, used: 0, errorReason });
              await new Promise(r => setTimeout(r, 250));
            }

            const active = results.filter(r => r.status === 'active');
            const exhausted = results.filter(r => r.status === 'exhausted');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              totalCount: results.length,
              active,
              exhausted,
              all: results
            }));
          });
          return;
        }

        // 4. Add Key Endpoint
        if (url.startsWith('/api/onlinecompiler/add') || url.startsWith('/api/compiler/add')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            let key = '';
            try {
              if (body) {
                const parsed = JSON.parse(body);
                key = (parsed.apiKey || parsed.key || '').trim();
              }
            } catch(e){}

            if (key && !ONLINE_COMPILER_KEYS.includes(key)) {
              ONLINE_COMPILER_KEYS.push(key);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, count: ONLINE_COMPILER_KEYS.length }));
          });
          return;
        }

        // 5. Compile Endpoint
        if (url.startsWith('/api/compile')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            let parsed = {};
            try { if (body) parsed = JSON.parse(body); } catch(e){}
            const { code, apiKey, onlineCompilerKeys } = parsed;
            
            const customKeys = Array.isArray(onlineCompilerKeys) ? onlineCompilerKeys : [];
            if (apiKey) customKeys.unshift(apiKey);
            const allKeys = [...new Set([...ONLINE_COMPILER_KEYS, ...customKeys])];

            for (const key of allKeys) {
              try {
                const ocResp = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', {
                  compiler: 'g++-15',
                  code: code,
                  input: ""
                }, {
                  timeout: 18000,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': key,
                    'ApiKey': key
                  }
                });

                let outputText = [ocResp.data?.output, ocResp.data?.result, ocResp.data?.stdout].filter(s => typeof s === 'string' && s.trim().length > 0).join('\n');
                let errorText = [ocResp.data?.error, ocResp.data?.stderr, ocResp.data?.compile_error, ocResp.data?.compiler_error, ocResp.data?.exception, ocResp.data?.message].filter(s => typeof s === 'string' && s.trim().length > 0 && s !== outputText).join('\n');

                const checkStr = (errorText + ' ' + (ocResp.data?.status || '')).toLowerCase();
                if (
                  ocResp.status === 429 || ocResp.status === 401 || ocResp.status === 403 ||
                  checkStr.includes('limit exceeded') || checkStr.includes('quota') || checkStr.includes('daily limit') || checkStr.includes('invalid api key') || checkStr.includes('unauthorized')
                ) {
                  continue;
                }

                if (
                  (errorText.includes('Internal error: code execution failed') || ocResp.data?.status === 'timeout' || ocResp.data?.signal === 'SIGXCPU' || ocResp.data?.signal === 'SIGKILL') &&
                  !errorText.includes('error:') && !errorText.includes('fatal error:') && !errorText.includes('undefined reference')
                ) {
                  errorText = "Runtime Error (SIGSEGV / Infinite Loop / Out-of-Bounds): Execution failed or timed out. Please check your loop conditions and array/pointer bounds.";
                }

                let combinedMessage = [outputText, errorText].filter(Boolean).join('\n\n') || "No output returned.";
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  program_message: combinedMessage,
                  compiler_error: errorText,
                  keyUsed: `${key.slice(0, 6)}...${key.slice(-4)}`
                }));
                return;
              } catch(e) {
                continue;
              }
            }

            // Piston Failover
            try {
              const pistonResp = await axios.post('https://emkc.org/api/v2/piston/execute', {
                language: 'cpp',
                version: '*',
                files: [{ content: code }]
              }, { timeout: 15000 });

              const runOut = pistonResp.data?.run?.stdout || '';
              const runErr = pistonResp.data?.run?.stderr || '';
              const compileErr = pistonResp.data?.compile?.stderr || '';
              const combined = [runOut, runErr, compileErr].filter(Boolean).join('\n');

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                program_message: combined || 'No output returned.',
                compiler_error: compileErr || runErr || '',
                engine: 'piston-failover'
              }));
              return;
            } catch(e) {}

            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'All compiler keys exhausted in pool' }));
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    apiDevServerPlugin()
  ]
})
