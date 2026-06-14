// scripts/screenshots/synthetic-feed.js
// Curated, synthetic POTA feed used ONLY to produce clean, repeatable doc
// screenshots. No real operating data — example callsigns and parks, generated
// timestamps relative to "now" so card ages look natural. Served to the browser
// via Playwright request interception in capture.mjs (the live api.pota.app is
// never hit during capture).

// Each spot matches the shape the dashboard reads: activator, frequency (kHz
// string), mode, reference, name/parkName, locationDesc, spotter, comments,
// count, latitude, longitude, spotId, spotTime (UTC ISO, no zone).
const PARKS = [
  { ref: 'US-0012', name: 'Grand Canyon National Park',        loc: 'US-AZ', lat: 36.106, lon: -112.113 },
  { ref: 'US-0025', name: 'Great Smoky Mountains National Park', loc: 'US-TN', lat: 35.611, lon: -83.489 },
  { ref: 'US-1483', name: 'Lake Superior State Forest',         loc: 'US-MI', lat: 46.553, lon: -86.300 },
  { ref: 'US-4567', name: 'Indiana Dunes National Park',        loc: 'US-IN', lat: 41.653, lon: -87.054 },
  { ref: 'US-0789', name: 'Joshua Tree National Park',          loc: 'US-CA', lat: 33.873, lon: -115.901 },
  { ref: 'US-2245', name: 'Cuyahoga Valley National Park',      loc: 'US-OH', lat: 41.261, lon: -81.572 },
  { ref: 'CA-0123', name: 'Algonquin Provincial Park',          loc: 'CA-ON', lat: 45.840, lon: -78.380 },
  { ref: 'US-0034', name: 'Acadia National Park',               loc: 'US-ME', lat: 44.350, lon: -68.210 },
  { ref: 'US-3001', name: 'Big Bend National Park',             loc: 'US-TX', lat: 29.250, lon: -103.250 },
  { ref: 'US-2050', name: 'Catskill State Forest',              loc: 'US-NY', lat: 42.100, lon: -74.300 },
  { ref: 'US-4102', name: 'Hot Springs National Park',          loc: 'US-AR', lat: 34.512, lon: -93.053 },
  { ref: 'US-0048', name: 'Shenandoah National Park',           loc: 'US-VA', lat: 38.530, lon: -78.350 },
];

// activator, freq(kHz), mode, spotter, ageMinutes, count, comments
const ROWS = [
  ['W7ABC', '14250', 'SSB',  'K9SPOT', 0.3, 1, '59 into the midwest'],
  ['K4XYZ', '7032',  'CW',   'W0DX',   0.7, 3, ''],
  ['N0DEF', '14074', 'FT8',  'AC0FT',  2,   1, 'auto-spotted'],
  ['AC9QQ', '18130', 'SSB',  'K9SPOT', 4,   2, 'QSY up 5'],
  ['W6MAP', '21285', 'SSB',  'N6HUNT', 6,   1, 'big pileup, please wait'],
  ['KE8RST','10120', 'CW',   'W8RST',  9,   1, ''],
  ['VE3POT','28400', 'SSB',  'VA3HAM', 12,  1, '10m is open!'],
  ['W1AW',  '50313', 'FT8',  'K1MUF',  18,  1, 'grid FN44'],
  ['KD5HAM','7185',  'SSB',  'N5TX',   24,  4, 'thanks for the hunters'],
  ['N2QRP', '10110', 'CW',   'W2NY',   33,  1, 'QRP 5 watts'],
  ['W5OAK', '14313', 'SSB',  'K5AR',   41,  1, 'QRT in 10 min'],
  ['K8ULTRA','21074','FT8',  'W8MI',   58,  1, ''],
];

export function buildFeed(now = Date.now()) {
  const spots = ROWS.map(([activator, frequency, mode, spotter, ageMin, count, comments], i) => {
    const p = PARKS[i % PARKS.length];
    const t = new Date(now - ageMin * 60_000).toISOString().replace(/\.\d+Z$/, ''); // UTC, no zone
    return {
      spotId: 100000 + i,
      activator, frequency, mode, spotter, count, comments,
      reference: p.ref, name: p.name, parkName: p.name, locationDesc: p.loc,
      latitude: p.lat, longitude: p.lon,
      spotTime: t,
    };
  });
  return { spots, hunted: [] };
}

// Synthetic operator profile for the hover card (any callsign).
export function buildProfile(call = 'W7ABC') {
  return {
    callsign: call, name: call, qth: 'Synthetic QTH', gravatar: null,
    activator: { parks: 142, activations: 318, qsos: 9461 },
    hunter:    { parks: 1207, qsos: 5832 },
    awards: 24, endorsements: 61,
  };
}
