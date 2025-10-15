// server.js
const express = require('express');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Basic startup diagnostics (no secrets)
console.log('[BOOT]', {
  NODE_ENV: process.env.NODE_ENV || null,
  PORT
});

// Trust proxies (Cloud Run)
app.set('trust proxy', true);

// Logging & JSON
app.use(morgan('tiny'));
app.use(express.json());

// Serve static files from /public (adjust if your build outputs elsewhere)
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  fallthrough: true,
}));

// Health checks (Cloud Run will hit these if configured)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/readyz', (_req, res) => res.status(200).send('ready'));

// Optional: fallback to index.html for SPA routes
app.get('*', (req, res, next) => {
  // Only fallback if requesting a path without a dot (e.g., /about not /main.js)
  if (!req.path.includes('.')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  return next();
});

// IMPORTANT: bind to 0.0.0.0 and Cloud Run's PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BOOT] Server listening on http://0.0.0.0:${PORT}`);
});
