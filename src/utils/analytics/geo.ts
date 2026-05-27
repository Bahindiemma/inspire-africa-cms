/**
 * Coarse geo lookup from IP using the bundled, offline GeoLite2 data in
 * `geoip-lite` (no external API calls — constraint of the analytics
 * design). Returns country (ISO-2), region and city. The raw IP is only
 * passed in here transiently and is never persisted by the caller.
 */
import geoip from 'geoip-lite';

export interface GeoResult {
  country: string | null;
  region: string | null;
  city: string | null;
}

const EMPTY: GeoResult = { country: null, region: null, city: null };

export function lookupGeo(ip: string | null | undefined): GeoResult {
  if (!ip) return EMPTY;
  try {
    const clean = ip.replace(/^::ffff:/i, '');
    // Skip private / loopback ranges — they yield no useful geo.
    if (
      /^(10\.|127\.|192\.168\.|169\.254\.|::1$|fc00:|fe80:)/i.test(clean) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(clean)
    ) {
      return EMPTY;
    }
    const g = geoip.lookup(clean);
    if (!g) return EMPTY;
    return {
      country: g.country || null,
      region: g.region || null,
      city: g.city || null,
    };
  } catch {
    return EMPTY;
  }
}
