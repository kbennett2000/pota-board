// src/server.js
// Minimal static server for the POTA board. Serves the single-file dashboard
// over the LAN. The HamLog integration adds an /api/* surface here later (a
// server-side proxy holding the HamLog JWT) — see docs/CLAUDE-CODE-KICKOFF.md.
//
// Design notes:
// - POTA's public API is read/written directly from the browser (CORS-open),
//   so nothing POTA-related needs to pass through this server.
// - HamLog requires a bearer token; that token must NOT live in the browser.
//   When the integration lands, the browser calls same-origin /api/hamlog/*
//   and this server attaches the JWT and forwards to HAMLOG_URL. Same-origin
//   means no CORS config on HamLog is required.

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHamlogClient } from './hamlog.js';
import { hamlogRouter } from './routes/hamlog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8075;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// Liveness probe (used by docker-compose healthcheck)
app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'pota-board' }));

// HamLog proxy: holds the JWT server-side; browser calls same-origin /api/hamlog/*.
// Endpoints handle the unconfigured case themselves (503), so mounting is unconditional.
const hamlog = createHamlogClient({
  baseUrl: process.env.HAMLOG_URL,
  user: process.env.HAMLOG_USER,
  pass: process.env.HAMLOG_PASS,
});
app.use('/api/hamlog', hamlogRouter(hamlog));

// Static dashboard
app.use(express.static(join(__dirname, '..', 'public'), { extensions: ['html'] }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`pota-board listening on http://0.0.0.0:${PORT}`);
});
