// server.js
const express = require('express');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', true);
app.use(morgan('tiny'));
app.use(express.json());

// ✅ Serve static files from /public
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Health checks (Cloud Run friendly)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/readyz', (_req, res) => res.status(200).send('ready'));

// ✅ Fallback to /public/index.html for non-file routes
app.get('*', (req, res, next) => {
  if (!req.path.includes('.')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  return next();
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(`[BOOT] Listening on http://0.0.0.0:${PORT}`)
);
