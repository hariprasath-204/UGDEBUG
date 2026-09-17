import { spawn } from 'child_process';

console.log('🚀 Starting Codathan Platform (Backend + Frontend)...');

// 1. Start Backend API Server
const server = spawn('node', ['api/index.js'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

server.on('error', (err) => {
  console.error('Failed to start backend server:', err);
});

// 2. Start Vite Frontend Dev Server
const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

vite.on('error', (err) => {
  console.error('Failed to start Vite dev server:', err);
});

const cleanup = () => {
  try {
    server.kill();
    vite.kill();
  } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
