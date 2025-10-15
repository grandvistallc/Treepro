// server.js
const express = require('express');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', true);
app.use(morgan('tiny'));
app.use(express.json());

// Your HTML files are in the repo root; serve from here
app.use(express.static(__dirname, { extensions: ['html'] }));

// Health checks
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/readyz', (_req, res) => res.status(200).send('ready'));

// SPA fallback to index.html (safe even if not SPA)
app.get('*', (req, res) => {
  if (!req.path.includes('.')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  return res.status(404).send('Not found');
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(`[BOOT] Listening on http://0.0.0.0:${PORT}`)
);
