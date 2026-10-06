import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const DEFAULT_API_KEY = process.env.ONLINE_COMPILER_API_KEY || 'ccb79ad09699924cb025d0ba0b6690ed';

// ── Pool of OnlineCompiler.io API Keys (Supports multiple keys with automatic failover) ──
let ONLINE_COMPILER_KEYS = [
  "a6ed2c1539a350079a242c2c2deecc36",
  "ccb79ad09699924cb025d0ba0b6690ed",
  "8471946023c357608b7666f763b66d9e",
  "00f2e3686a1712e01b8fa42d4ff76635",
  "31f89d72d1ae6013e4925c06bac75502"
];

let ONLINE_COMPILER_KEY_STATUS = {};

// Helper: Get all unique keys (Built-in + Admin custom keys)
const getAllOnlineCompilerKeys = (customKeys = []) => {
  const customArr = Array.isArray(customKeys) 
    ? customKeys.map(k => (typeof k === 'string' ? k.trim() : (k?.apiKey || k?.key || '').trim())).filter(Boolean)
    : [];
  return [...new Set([...ONLINE_COMPILER_KEYS, ...customArr])];
};

// ── GET/POST Key Count & Live Summary ──
app.all(['/api/onlinecompiler/count', '/api/compiler/count'], (req, res) => {
  const customKeys = Array.isArray(req.body?.keys) ? req.body.keys : [];
  const allUnique = getAllOnlineCompilerKeys(customKeys);

  const allWithStatus = allUnique.map(key => {
    const cached = ONLINE_COMPILER_KEY_STATUS[key] || { status: 'active', used: 0, lastError: null };
    return {
      apiKey: key,
      status: cached.status || 'active',
      used: cached.used !== undefined ? cached.used : 0,
      errorReason: cached.lastError || null
    };
  });

  const active = allWithStatus.filter(r => r.status === 'active');
  const exhausted = allWithStatus.filter(r => r.status === 'exhausted');

  return res.json({
    totalCount: allUnique.length,
    active,
    exhausted,
    all: allWithStatus
  });
});

// ── Test & Verify Status of All OnlineCompiler Keys Live ──
app.post(['/api/onlinecompiler/status', '/api/compiler/status'], async (req, res) => {
  const customKeys = Array.isArray(req.body?.keys) ? req.body.keys : [];
  const allUnique = getAllOnlineCompilerKeys(customKeys);

  const results = [];
  for (const key of allUnique) {
    let status = 'active';
    let errorReason = null;
    let used = ONLINE_COMPILER_KEY_STATUS[key]?.used || 0;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', {
          compiler: 'gcc-15',
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
      } catch (err) {
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
          status = ONLINE_COMPILER_KEY_STATUS[key]?.status || 'active';
          errorReason = null;
        }
        break;
      }
    }

    ONLINE_COMPILER_KEY_STATUS[key] = {
      status,
      used,
      lastError: errorReason,
      lastChecked: Date.now()
    };

    results.push({
      apiKey: key,
      status,
      used,
      errorReason
    });

    await new Promise(r => setTimeout(r, 250));
  }

  const active = results.filter(r => r.status === 'active');
  const exhausted = results.filter(r => r.status === 'exhausted');

  return res.json({
    active,
    exhausted,
    all: results,
    totalCount: results.length
  });
});

// ── Add New OnlineCompiler.io Key to Backend Pool ──
app.post(['/api/onlinecompiler/add', '/api/compiler/add'], (req, res) => {
  const rawKey = req.body?.apiKey || req.body?.key;
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    return res.status(400).json({ error: 'Valid apiKey string is required' });
  }

  const key = rawKey.trim();
  if (!ONLINE_COMPILER_KEYS.includes(key)) {
    ONLINE_COMPILER_KEYS.push(key);
    ONLINE_COMPILER_KEY_STATUS[key] = { status: 'active', used: 0, lastError: null, lastChecked: Date.now() };
  }

  return res.json({ success: true, count: ONLINE_COMPILER_KEYS.length });
});

// ── Time Endpoint ──
app.get('/api/time', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res.json({ now: Date.now() });
});

// ── Core Code Compilation Endpoint with Multi-Key Rotation & Failover ──
app.post('/api/compile', async (req, res) => {
  const { code, compiler, apiKey, onlineCompilerKeys } = req.body;

  if (!code || !compiler) {
    return res.status(400).json({ error: 'Code and compiler parameters are required' });
  }

  const compLower = compiler.toLowerCase();
  const isC = compLower === 'c' || compLower === 'gcc-head-c' || compLower.includes('gcc');
  const isCpp = compLower === 'cpp' || compLower === 'c++' || compLower.includes('g++');

  const ONLINE_COMPILER_LANG = {
    "c": "gcc-15",
    "gcc-head-c": "gcc-15",
    "c++": "g++-15",
    "cpp": "g++-15",
    "gcc-head": "g++-15"
  };

  const ocCompiler = ONLINE_COMPILER_LANG[compLower] || (isC ? 'gcc-15' : 'g++-15');

  // Collect all potential OnlineCompiler keys to try in failover order
  const requestKeys = Array.isArray(onlineCompilerKeys) ? onlineCompilerKeys : [];
  if (apiKey) requestKeys.unshift(apiKey);

  const allKeys = getAllOnlineCompilerKeys(requestKeys);

  // 1. Loop through OnlineCompiler.io keys (Automatic Failover if limit is finished)
  for (const key of allKeys) {
    try {
      const ocPayload = {
        compiler: ocCompiler,
        code: code,
        input: ""
      };

      const ocResp = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', ocPayload, {
        timeout: 18000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': key,
          'ApiKey': key
        }
      });

      let outputText = [
        ocResp.data?.output,
        ocResp.data?.result,
        ocResp.data?.stdout
      ].filter(s => typeof s === 'string' && s.trim().length > 0).join('\n');

      let errorText = [
        ocResp.data?.error,
        ocResp.data?.stderr,
        ocResp.data?.compile_error,
        ocResp.data?.compiler_error,
        ocResp.data?.exception,
        ocResp.data?.message
      ].filter(s => typeof s === 'string' && s.trim().length > 0 && s !== outputText).join('\n');

      // Check if error is quota exhaustion or authorization failure
      const checkStr = (errorText + ' ' + (ocResp.data?.status || '')).toLowerCase();
      if (
        ocResp.status === 429 || ocResp.status === 401 || ocResp.status === 403 ||
        checkStr.includes('limit exceeded') ||
        checkStr.includes('quota') ||
        checkStr.includes('daily limit') ||
        checkStr.includes('invalid api key') ||
        checkStr.includes('unauthorized')
      ) {
        ONLINE_COMPILER_KEY_STATUS[key] = {
          status: 'exhausted',
          lastError: errorText || 'Quota/Limit Finished',
          lastChecked: Date.now()
        };
        console.warn(`OnlineCompiler key (${key.slice(0, 6)}...${key.slice(-4)}) limit finished. Failing over to next key...`);
        continue; // Try next key!
      }

      // Record successful active use
      ONLINE_COMPILER_KEY_STATUS[key] = {
        status: 'active',
        used: (ONLINE_COMPILER_KEY_STATUS[key]?.used || 0) + 1,
        lastError: null,
        lastChecked: Date.now()
      };

      if (
        (errorText.includes('Internal error: code execution failed') || ocResp.data?.status === 'timeout' || ocResp.data?.signal === 'SIGXCPU' || ocResp.data?.signal === 'SIGKILL') &&
        !errorText.includes('error:') && !errorText.includes('fatal error:') && !errorText.includes('undefined reference')
      ) {
        errorText = "Runtime Error (SIGSEGV / Infinite Loop / Out-of-Bounds): Execution failed or timed out. Please check your loop conditions and array/pointer bounds.";
      }

      let combinedMessage = [outputText, errorText].filter(Boolean).join('\n\n');
      if (!combinedMessage.trim()) {
        combinedMessage = "No output returned.";
      }

      return res.json({
        program_message: combinedMessage,
        compiler_error: errorText,
        keyUsed: `${key.slice(0, 6)}...${key.slice(-4)}`
      });
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || '';
      const errStatus = err?.response?.status;
      if (errStatus === 429 || errStatus === 401 || errStatus === 403 || errMsg.toLowerCase().includes('limit') || errMsg.toLowerCase().includes('quota')) {
        ONLINE_COMPILER_KEY_STATUS[key] = {
          status: 'exhausted',
          lastError: errMsg || `HTTP ${errStatus} Quota Limit`,
          lastChecked: Date.now()
        };
      }
      console.warn(`OnlineCompiler key (${key.slice(0, 6)}...${key.slice(-4)}) error: ${errMsg}. Trying next key...`);
      continue;
    }
  }

  // 2. High-Availability Secondary Failover Engine (Piston) if all OnlineCompiler keys fail
  try {
    const pistonLang = isC ? 'c' : 'cpp';
    const pistonResp = await axios.post('https://emkc.org/api/v2/piston/execute', {
      language: pistonLang,
      version: '*',
      files: [{ content: code }]
    }, { timeout: 15000 });

    const runOut = pistonResp.data?.run?.stdout || '';
    const runErr = pistonResp.data?.run?.stderr || '';
    const compileErr = pistonResp.data?.compile?.stderr || '';
    const combined = [runOut, runErr, compileErr].filter(Boolean).join('\n');

    return res.json({
      program_message: combined || 'No output returned.',
      compiler_error: compileErr || runErr || '',
      engine: 'piston-failover'
    });
  } catch (pistonErr) {
    console.error('All failover compiler engines exhausted:', pistonErr?.message);
  }

  return res.status(500).json({
    error: 'Compilation failed across all available OnlineCompiler.io keys.',
    detail: 'All OnlineCompiler.io keys in the pool have finished their quota. Please add new OnlineCompiler.io API keys in the Admin Dashboard.'
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback for SPA routing
app.get(/^(.*)$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global Express Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err?.message || err);
  res.status(500).json({ error: 'Internal Server Error', detail: err?.message || 'Unexpected server exception occurred.' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`OnlineCompiler.io Keys Loaded: ${ONLINE_COMPILER_KEYS.length} keys available for automatic failover.`);
  });
}

// Process-level crash protection
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception caught:', err?.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at promise:', promise, 'reason:', reason);
});

export default app;
