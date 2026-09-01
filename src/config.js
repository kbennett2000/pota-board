// src/config.js
// Single source of truth for what the browser is allowed to see.
//
// The browser fetches CARTO tiles itself, so the basemap key ends up visible in
// devtools no matter what we do — it rides in the tile URL. Keeping it in env
// is about keeping it out of this public repo and out of the image, not about
// secrecy. CARTO's free key is a fair-use meter, not a credential.
//
// Never add a genuine secret here (HamLog creds especially) — this response is
// public. test/config.test.js guards that.

export function publicConfig(env = {}) {
  return { cartoKey: String(env.CARTO_API_KEY || '').trim() };
}
