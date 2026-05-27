/**
 * User-agent parsing + bot scoring. Used server-side at ingestion so we
 * never trust client-supplied device info, and so obvious bots can be
 * flagged (botScore) and optionally excluded from dashboards.
 */
import { UAParser } from 'ua-parser-js';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';

export interface UaResult {
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
  botScore: number; // 0 (human) .. 1 (definite bot)
}

const BOT_RE =
  /bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|discordbot|preview|headless|phantomjs|python-requests|curl\/|wget|axios\/|node-fetch|go-http|java\/|okhttp|lighthouse|gtmetrix|pingdom|uptimerobot|semrush|ahrefs|dotbot|mj12bot|petalbot/i;

export function parseUa(ua: string | null | undefined): UaResult {
  if (!ua) {
    return { deviceType: 'unknown', browser: null, os: null, botScore: 0.6 };
  }

  let botScore = BOT_RE.test(ua) ? 1 : 0;

  const r = new UAParser(ua).getResult();
  const browser = r.browser.name ?? null;
  const os = r.os.name ?? null;
  const dt = r.device.type; // 'mobile' | 'tablet' | 'console' | ... | undefined

  let deviceType: DeviceType;
  if (botScore >= 1) {
    deviceType = 'bot';
  } else if (dt === 'mobile') {
    deviceType = 'mobile';
  } else if (dt === 'tablet') {
    deviceType = 'tablet';
  } else if (!browser) {
    // No recognisable browser and not a known bot → treat as suspicious.
    deviceType = 'unknown';
    botScore = Math.max(botScore, 0.5);
  } else {
    deviceType = 'desktop';
  }

  return { deviceType, browser, os, botScore };
}
