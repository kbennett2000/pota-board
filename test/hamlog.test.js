// test/hamlog.test.js
// Unit tests for the HamLog proxy client/mapping/validation. HamLog is fully
// mocked via an injected fetchImpl — no network, CI-safe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHamlogClient,
  mapContactToQso,
  validateContactBody,
  HamlogConfigError,
  HamlogUnreachableError,
  HamlogAuthError,
  HamlogDuplicateError,
} from '../src/hamlog.js';

// --- Mock fetch -------------------------------------------------------------
// Returns a fetchImpl plus a `calls` log. Each handler is matched on the path
// (the bit after the base) and the HTTP method. `body` is parsed JSON.
function mockFetch(handlers) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    const auth = init.headers && (init.headers.authorization || init.headers.Authorization);
    calls.push({ path, method, body, auth });
    const key = `${method} ${path}`;
    const handler = handlers[key];
    if (!handler) throw new Error(`unexpected request: ${key}`);
    const resp = typeof handler === 'function' ? handler(calls) : handler;
    return makeRes(resp);
  };
  return { fetchImpl, calls };
}

function makeRes({ status = 200, json } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (json === undefined) throw new Error('no json');
      return json;
    },
  };
}

const ENV = { baseUrl: 'http://hamlog.test:8050/', user: 'op', pass: 'secret' };
const LOGIN_OK = { status: 200, json: { token: 'jwt-123', user: { id: 1 } } };

// --- mapContactToQso --------------------------------------------------------
test('mapContactToQso maps rstSent->sent and rstRcvd->received', () => {
  const out = mapContactToQso({
    date: '2026-06-13', time: '1430', callsign: 'k6aty', frequency: '14.250',
    mode: 'SSB', band: '20m', notes: 'hi', rstSent: '59', rstRcvd: '57',
  });
  assert.equal(out.sent, '59');
  assert.equal(out.received, '57');
  assert.equal(out.callsign, 'k6aty');
  assert.equal(out.frequency, '14.250');
  assert.ok(!('rstSent' in out) && !('rstRcvd' in out) && !('parkRef' in out));
});

test('mapContactToQso defaults missing optionals to empty strings', () => {
  const out = mapContactToQso({ date: '2026-06-13', callsign: 'AE9S', frequency: '7.1' });
  assert.deepEqual(
    { time: out.time, mode: out.mode, band: out.band, notes: out.notes, sent: out.sent, received: out.received },
    { time: '', mode: '', band: '', notes: '', sent: '', received: '' },
  );
});

// --- validateContactBody ----------------------------------------------------
test('validateContactBody accepts a valid body and trims parkRef', () => {
  const v = validateContactBody({ date: '2026-06-13', callsign: 'W1AW/3', frequency: '14.250', parkRef: ' US-0001 ' });
  assert.equal(v.ok, true);
  assert.equal(v.value.parkRef, 'US-0001');
});

test('validateContactBody rejects missing required fields', () => {
  assert.equal(validateContactBody({ callsign: 'AE9S', frequency: '14.2' }).ok, false); // no date
  assert.equal(validateContactBody({ date: '2026-06-13', frequency: '14.2' }).ok, false); // no callsign
  assert.equal(validateContactBody({ date: '2026-06-13', callsign: 'AE9S' }).ok, false); // no frequency
});

test('validateContactBody rejects bad callsign and bad frequency', () => {
  assert.equal(validateContactBody({ date: 'd', callsign: 'not a call!', frequency: '14.2' }).ok, false);
  assert.equal(validateContactBody({ date: 'd', callsign: 'AE9S', frequency: 'abc' }).ok, false);
  assert.equal(validateContactBody({ date: 'd', callsign: 'AE9S', frequency: '0' }).ok, false);
});

test('validateContactBody rejects empty parkRef when provided', () => {
  assert.equal(validateContactBody({ date: 'd', callsign: 'AE9S', frequency: '14.2', parkRef: '  ' }).ok, false);
});

// --- client: config ---------------------------------------------------------
test('client throws HamlogConfigError when creds are unset', async () => {
  const client = createHamlogClient({ baseUrl: '', user: '', pass: '', fetchImpl: async () => makeRes({}) });
  assert.equal(client.configured, false);
  await assert.rejects(() => client.health(), HamlogConfigError);
  await assert.rejects(() => client.logContact({ callsign: 'AE9S' }), HamlogConfigError);
});

// --- client: login once then reuse ------------------------------------------
test('client logs in once and reuses the token across calls', async () => {
  const { fetchImpl, calls } = mockFetch({
    'POST /api/auth/login': LOGIN_OK,
    'GET /api/auth/me': { status: 200, json: { id: 1 } },
  });
  const client = createHamlogClient({ ...ENV, fetchImpl });
  await client.health();
  await client.health();
  const logins = calls.filter(c => c.path === '/api/auth/login');
  assert.equal(logins.length, 1, 'should log in exactly once');
  const me = calls.filter(c => c.path === '/api/auth/me');
  assert.equal(me.length, 2);
  assert.equal(me[0].auth, 'Bearer jwt-123');
});

// --- client: refresh on 401 then retry --------------------------------------
test('client refreshes the JWT on 401 and retries once', async () => {
  let meHits = 0;
  const { fetchImpl, calls } = mockFetch({
    'POST /api/auth/login': () => ({ status: 200, json: { token: `jwt-${calls.filter(c => c.path === '/api/auth/login').length}` } }),
    'GET /api/auth/me': () => {
      meHits += 1;
      return meHits === 1 ? { status: 401, json: { error: 'expired' } } : { status: 200, json: { id: 1 } };
    },
  });
  const client = createHamlogClient({ ...ENV, fetchImpl });
  await client.health();
  assert.equal(calls.filter(c => c.path === '/api/auth/login').length, 2, 're-login after 401');
  assert.equal(meHits, 2, 'retry after refresh');
});

// --- client: contact with and without park ----------------------------------
test('logContact creates contact and attaches park when parkRef present', async () => {
  const { fetchImpl, calls } = mockFetch({
    'POST /api/auth/login': LOGIN_OK,
    'POST /api/qsos/': { status: 201, json: { id: 42 } },
    'POST /api/qsos/42/pota': { status: 201, json: { id: 7 } },
  });
  const client = createHamlogClient({ ...ENV, fetchImpl });
  const result = await client.logContact({ date: '2026-06-13', callsign: 'K6ATY', frequency: '14.250', rstSent: '59', rstRcvd: '57', parkRef: 'US-2631' });
  assert.deepEqual(result, { id: 42, potaLinked: true });
  const pota = calls.find(c => c.path === '/api/qsos/42/pota');
  assert.deepEqual(pota.body, { parkId: 'US-2631', qsoType: '1' });
  const create = calls.find(c => c.path === '/api/qsos/');
  assert.equal(create.body.sent, '59');
  assert.equal(create.body.received, '57');
});

test('logContact skips park attach when no parkRef', async () => {
  const { fetchImpl, calls } = mockFetch({
    'POST /api/auth/login': LOGIN_OK,
    'POST /api/qsos/': { status: 201, json: { id: 99 } },
  });
  const client = createHamlogClient({ ...ENV, fetchImpl });
  const result = await client.logContact({ date: '2026-06-13', callsign: 'AE9S', frequency: '7.1' });
  assert.deepEqual(result, { id: 99, potaLinked: false });
  assert.equal(calls.some(c => c.path.endsWith('/pota')), false);
});

test('logContact reports id with warning when park attach fails', async () => {
  const { fetchImpl } = mockFetch({
    'POST /api/auth/login': LOGIN_OK,
    'POST /api/qsos/': { status: 201, json: { id: 5 } },
    'POST /api/qsos/5/pota': { status: 500, json: { error: 'boom' } },
  });
  const client = createHamlogClient({ ...ENV, fetchImpl });
  const result = await client.logContact({ date: 'd', callsign: 'AE9S', frequency: '7.1', parkRef: 'US-0001' });
  assert.equal(result.id, 5);
  assert.equal(result.potaLinked, false);
  assert.match(result.warning, /link failed/);
});

// --- client: duplicate and unreachable --------------------------------------
test('logContact surfaces HamlogDuplicateError on 409', async () => {
  const { fetchImpl } = mockFetch({
    'POST /api/auth/login': LOGIN_OK,
    'POST /api/qsos/': { status: 409, json: { error: 'dup' } },
  });
  const client = createHamlogClient({ ...ENV, fetchImpl });
  await assert.rejects(() => client.logContact({ date: 'd', callsign: 'AE9S', frequency: '7.1' }), HamlogDuplicateError);
});

test('client surfaces HamlogUnreachableError when fetch rejects', async () => {
  const fetchImpl = async () => { throw new Error('ECONNREFUSED'); };
  const client = createHamlogClient({ ...ENV, fetchImpl });
  await assert.rejects(() => client.health(), HamlogUnreachableError);
  await assert.rejects(() => client.logContact({ date: 'd', callsign: 'AE9S', frequency: '7.1' }), HamlogUnreachableError);
});

test('client surfaces HamlogAuthError when login is rejected', async () => {
  const { fetchImpl } = mockFetch({ 'POST /api/auth/login': { status: 401, json: { error: 'bad creds' } } });
  const client = createHamlogClient({ ...ENV, fetchImpl });
  await assert.rejects(() => client.health(), HamlogAuthError);
});

// --- secrets never leak in error messages -----------------------------------
test('typed errors never contain the password or token', async () => {
  const fetchImpl = async () => { throw new Error('ECONNREFUSED'); };
  const client = createHamlogClient({ ...ENV, fetchImpl });
  try {
    await client.logContact({ date: 'd', callsign: 'AE9S', frequency: '7.1' });
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(!err.message.includes('secret'));
    assert.ok(!err.message.includes('jwt-123'));
  }
});
