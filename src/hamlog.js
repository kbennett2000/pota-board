// src/hamlog.js
// HamLog client + pure mapping/validation for the /api/hamlog proxy.
//
// The HamLog JWT lives ONLY here (in a closure on the server) — it never reaches
// the browser. The client logs in with HAMLOG_USER/HAMLOG_PASS, caches the token
// in memory, and refreshes once on a 401. Everything is injectable (fetchImpl) so
// the proxy is unit-tested with HamLog fully mocked — no live calls in CI.
//
// Contract (read off github.com/kbennett2000/HamLog — note routes mount under /api):
//   POST {base}/api/auth/login  {username,password}        -> {token,user}
//   GET  {base}/api/auth/me      (Bearer)                   -> user profile
//   POST {base}/api/qsos/        (Bearer) createQsoSchema   -> 201 {id} | 409 dup
//   POST {base}/api/qsos/:id/pota(Bearer) {parkId,qsoType}  -> 201 {id}

// --- Typed errors (messages never carry the token or password) --------------
export class HamlogConfigError extends Error {
  constructor(msg = 'HamLog not configured') { super(msg); this.name = 'HamlogConfigError'; }
}
export class HamlogUnreachableError extends Error {
  constructor(msg = 'HamLog unreachable') { super(msg); this.name = 'HamlogUnreachableError'; }
}
export class HamlogAuthError extends Error {
  constructor(msg = 'HamLog login failed') { super(msg); this.name = 'HamlogAuthError'; }
}
export class HamlogDuplicateError extends Error {
  constructor(msg = 'Duplicate QSO: already logged in HamLog') { super(msg); this.name = 'HamlogDuplicateError'; }
}
export class HamlogError extends Error {
  constructor(msg = 'HamLog request failed') { super(msg); this.name = 'HamlogError'; }
}

// --- Pure mapping: proxy body -> HamLog createQsoSchema ---------------------
// rstSent -> sent, rstRcvd -> received; everything else passes through. HamLog
// applies its own defaults, but we send explicit strings to keep it predictable.
export function mapContactToQso(body) {
  return {
    date: str(body.date),
    time: normalizeTime(str(body.time)),
    callsign: str(body.callsign),
    frequency: str(body.frequency),
    mode: str(body.mode),
    band: str(body.band),
    notes: str(body.notes),
    sent: str(body.rstSent),
    received: str(body.rstRcvd),
  };
}

// --- Boundary validation (mirrors HamLog's lean-permissive rules) -----------
const CALLSIGN_RE = /^[A-Z0-9]+(?:\/[A-Z0-9]+)*$/i;

export function validateContactBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'request body must be a JSON object' };
  }
  // Required, non-empty
  for (const f of ['date', 'callsign', 'frequency']) {
    if (typeof body[f] !== 'string' || body[f].trim() === '') {
      return { ok: false, error: `${f} is required` };
    }
  }
  if (!CALLSIGN_RE.test(body.callsign.trim())) {
    return { ok: false, error: 'invalid callsign format' };
  }
  const freq = parseFloat(String(body.frequency).trim());
  if (!Number.isFinite(freq) || freq <= 0) {
    return { ok: false, error: 'invalid frequency' };
  }
  // Optional string fields must be strings when present
  for (const f of ['time', 'mode', 'band', 'notes', 'rstSent', 'rstRcvd', 'parkRef']) {
    if (body[f] !== undefined && typeof body[f] !== 'string') {
      return { ok: false, error: `${f} must be a string` };
    }
  }
  const parkRef = typeof body.parkRef === 'string' ? body.parkRef.trim() : '';
  if (body.parkRef !== undefined && parkRef === '') {
    return { ok: false, error: 'parkRef must not be empty when provided' };
  }
  return { ok: true, value: { ...body, parkRef: parkRef || undefined } };
}

function str(v) { return v == null ? '' : String(v); }

// HamLog stores QSO time colon-formatted; its toUtcDatetime only colon-fixes a
// length-5 "HH:MM", so a bare compact "HHMM"/"HHMMSS" builds an invalid DATETIME
// and the insert fails (500 -> our 502). Mirror HamLog's ADIF parser: expand a
// compact time to colon form; pass anything already colon-separated (or empty,
// or otherwise unexpected) through untouched and let HamLog validate.
function normalizeTime(t) {
  if (t.includes(':')) return t;
  if (/^\d{4}$/.test(t)) return `${t.slice(0, 2)}:${t.slice(2)}`;
  if (/^\d{6}$/.test(t)) return `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4)}`;
  return t;
}

function trimBase(url) { return String(url || '').replace(/\/+$/, ''); }

// --- Client -----------------------------------------------------------------
export function createHamlogClient({ baseUrl, user, pass, fetchImpl = globalThis.fetch } = {}) {
  const base = trimBase(baseUrl);
  const configured = Boolean(base && user && pass);
  let token = null; // in-memory only

  function requireConfigured() {
    if (!configured) throw new HamlogConfigError();
  }

  // fetch wrapper that turns network failures into a typed unreachable error
  async function call(path, init) {
    let res;
    try {
      res = await fetchImpl(`${base}${path}`, init);
    } catch {
      throw new HamlogUnreachableError();
    }
    return res;
  }

  async function login() {
    const res = await call('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass }),
    });
    if (!res.ok) throw new HamlogAuthError();
    let data;
    try { data = await res.json(); } catch { throw new HamlogAuthError('HamLog login returned an unexpected response'); }
    if (!data || typeof data.token !== 'string') throw new HamlogAuthError('HamLog login returned no token');
    token = data.token;
    return token;
  }

  async function ensureToken() {
    if (!token) await login();
    return token;
  }

  // Authed request that refreshes the JWT once on a 401 and retries.
  async function authed(path, init = {}) {
    await ensureToken();
    const send = () => call(path, {
      ...init,
      headers: { ...(init.headers || {}), authorization: `Bearer ${token}` },
    });
    let res = await send();
    if (res.status === 401) {
      token = null;
      await login();
      res = await send();
    }
    return res;
  }

  // GET /api/auth/me — cheap authed reachability probe. Returns true or throws typed.
  async function health() {
    requireConfigured();
    const res = await authed('/api/auth/me', { method: 'GET' });
    if (res.ok) return true;
    if (res.status === 401) throw new HamlogAuthError();
    throw new HamlogError(`HamLog health check failed (${res.status})`);
  }

  // Create a contact and, when parkRef is set, attach the park. Returns
  // { id, potaLinked, warning? }. If the contact is created but the park-attach
  // fails, we still report the id (the contact already exists in HamLog).
  async function logContact(body) {
    requireConfigured();
    const createRes = await authed('/api/qsos/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(mapContactToQso(body)),
    });
    if (createRes.status === 409) throw new HamlogDuplicateError();
    if (!createRes.ok) throw new HamlogError(`HamLog rejected the contact (${createRes.status})`);
    let created;
    try { created = await createRes.json(); } catch { throw new HamlogError('HamLog returned an unexpected response'); }
    const id = created && created.id;
    if (id == null) throw new HamlogError('HamLog did not return a contact id');

    if (!body.parkRef) return { id, potaLinked: false };

    const potaRes = await authed(`/api/qsos/${encodeURIComponent(id)}/pota`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parkId: body.parkRef, qsoType: '1' }),
    });
    if (!potaRes.ok) {
      return { id, potaLinked: false, warning: `contact ${id} created but park ${body.parkRef} link failed (${potaRes.status})` };
    }
    return { id, potaLinked: true };
  }

  return { configured, health, logContact };
}
