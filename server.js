// server.js
const express = require('express');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// Trust Cloud Run proxies
app.set('trust proxy', true);

// Middleware
app.use(morgan('tiny'));
app.use(express.json());

// --- Serve static assets ---
const publicDir = path.join(__dirname, 'public');
const imagesDir = path.join(__dirname, 'Images'); // root Images folder
app.use(express.static(publicDir, { extensions: ['html'] }));
app.use('/Images', express.static(imagesDir));    // expose /Images publicly

// --- Serve index.html from /views as root ---
const indexPath = path.join(__dirname, 'views', 'index.html');
const contactPath = path.join(publicDir, 'contact.html'); // <- contact page

// --- Health checks ---
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/readyz', (_req, res) => res.status(200).send('ready'));

// --- Root route (views/index.html) ---
app.get('/', (_req, res) => res.sendFile(indexPath));

// --- Contact page route (public/contact.html) ---
app.get('/contact', (_req, res) => res.sendFile(contactPath));

// --- All other routes → fallback to index.html ---
app.get('*', (_req, res) => res.sendFile(indexPath));

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BOOT] Listening on port ${PORT}`);
  console.log(`Static /public -> ${publicDir}`);
  console.log(`Static /Images -> ${imagesDir}`);
  console.log(`Root file -> ${indexPath}`);
  console.log(`Contact file -> ${contactPath}`);
});
