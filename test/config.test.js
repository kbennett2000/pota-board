// test/config.test.js
// Unit tests for the public browser config. The point of the last test is the
// allowlist: /api/config is served to anyone who can reach the dashboard, so
// nothing may ride along with the basemap key.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicConfig } from '../src/config.js';

test('returns the CARTO key when set', () => {
  assert.deepEqual(publicConfig({ CARTO_API_KEY: 'cb1_test_key' }), { cartoKey: 'cb1_test_key' });
});

test('returns an empty key when unset, blank, or absent', () => {
  assert.equal(publicConfig({}).cartoKey, '');
  assert.equal(publicConfig({ CARTO_API_KEY: '' }).cartoKey, '');
  assert.equal(publicConfig({ CARTO_API_KEY: '   ' }).cartoKey, '');
  assert.equal(publicConfig().cartoKey, '');
});

test('trims surrounding whitespace (stray newline from a .env file)', () => {
  assert.equal(publicConfig({ CARTO_API_KEY: '  cb1_test_key\n' }).cartoKey, 'cb1_test_key');
});

test('never leaks HamLog credentials into the public response', () => {
  const out = publicConfig({
    CARTO_API_KEY: 'cb1_test_key',
    HAMLOG_URL: 'http://192.168.1.62:8050',
    HAMLOG_USER: 'operator',
    HAMLOG_PASS: 'hunter2',
  });
  assert.deepEqual(Object.keys(out), ['cartoKey']);
  assert.equal(JSON.stringify(out).includes('hunter2'), false);
  assert.equal(JSON.stringify(out).includes('operator'), false);
});
