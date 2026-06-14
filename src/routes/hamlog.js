// src/routes/hamlog.js
// Thin Express router for the same-origin HamLog proxy. Validates input at the
// /api boundary, calls the client, maps typed client errors to plain status
// codes, and never leaks the JWT. All HamLog logic lives in ../hamlog.js.

import { Router } from 'express';
import {
  validateContactBody,
  HamlogConfigError,
  HamlogUnreachableError,
  HamlogAuthError,
  HamlogDuplicateError,
} from '../hamlog.js';

// Map a typed client error to { status, error } for the response.
function errorResponse(err) {
  if (err instanceof HamlogConfigError) return { status: 503, error: 'HamLog not configured' };
  if (err instanceof HamlogUnreachableError) return { status: 502, error: 'HamLog unreachable' };
  if (err instanceof HamlogAuthError) return { status: 502, error: 'HamLog login failed' };
  if (err instanceof HamlogDuplicateError) return { status: 409, error: 'Duplicate QSO: already logged in HamLog' };
  return { status: 502, error: 'HamLog request failed' };
}

export function hamlogRouter(client) {
  const router = Router();

  // Proxy can auth and reach HamLog. Never returns the token.
  router.get('/health', async (_req, res) => {
    try {
      await client.health();
      res.json({ ok: true });
    } catch (err) {
      const { status, error } = errorResponse(err);
      res.status(status).json({ ok: false, error });
    }
  });

  // Create a contact (and attach the park when parkRef is present).
  router.post('/contact', async (req, res) => {
    const v = validateContactBody(req.body);
    if (!v.ok) {
      res.status(400).json({ error: v.error });
      return;
    }
    try {
      const result = await client.logContact(v.value);
      res.status(201).json(result);
    } catch (err) {
      const { status, error } = errorResponse(err);
      res.status(status).json({ error });
    }
  });

  return router;
}
