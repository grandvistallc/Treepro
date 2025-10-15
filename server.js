// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', true);
app.use(morgan('tiny'));
app.use(express.json());

// Decide static dir: prefer /public if it exists AND has index.html; else fall back to repo root
const publicDir = path.join(__dirname, 'public');
const rootIndex = path.join(__dirname, 'index.html');
const publicIndex = path.join(publicDir, 'index.html');

const usePublic = fs.existsSync(publicDir) && fs.existsSync(publicIndex);
const staticDir = usePublic ? publicDir : __dirname;
const fallbackIndex = usePublic ? publicIndex : rootIndex;

console.log('[BOOT] staticDir =', staticDir);
app.use(express.static(staticDir, { extensions: ['html'] }));

// Health checks
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/readyz', (_req, res) => res.status(200).send('ready'));

// Fallback to index.html for non-file routes
app.get('*', (req, res, next) => {
  if (!req.path.includes('.')) return res.sendFile(fallbackIndex);
  return next();
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(`[BOOT] Listening on http://0.0.0.0:${PORT}`)
);
