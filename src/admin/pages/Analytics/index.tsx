/**
 * Visitor Analytics dashboard (admin menu link → /analytics).
 *
 * Reads the pre-aggregated `analytics-daily-rollup` rows + a snapshot of
 * recent `analytics-session` rows through the standard, already-authed
 * content-manager admin API (useFetchClient), then renders summary cards
 * and simple bar charts. Deliberately framework-light (native elements +
 * inline styles) so it can never break the admin build.
 */
import * as React from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

const YELLOW = '#F8BD26';
const INK = '#0A0A0A';

interface Rollup {
  date: string;
  sessions: number;
  pageviews: number;
  events: number;
  byPath?: Record<string, number>;
  byCountry?: Record<string, number>;
  byDevice?: Record<string, number>;
  bySection?: Record<string, number>;
  byReferrer?: Record<string, number>;
  scrollDepthBuckets?: Record<string, number>;
  consentAnalytics?: number;
  consentAll?: number;
}

function mergeMaps(target: Record<string, number>, src?: Record<string, number>) {
  if (!src) return;
  for (const k of Object.keys(src)) target[k] = (target[k] || 0) + src[k];
}

function topN(map: Record<string, number>, n = 10): [string, number][] {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(10,10,10,0.1)',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 1px 2px rgba(10,10,10,0.04), 0 8px 24px rgba(10,10,10,0.06)',
};

function BarList({ title, rows, unit }: { title: string; rows: [string, number][]; unit?: string }) {
  const max = rows.reduce((m, [, v]) => Math.max(m, v), 0) || 1;
  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>{title}</h3>
      {rows.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No data yet.</p>}
      {rows.map(([label, value]) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
              {label || '(none)'}
            </span>
            <strong>
              {value}
              {unit ? ` ${unit}` : ''}
            </strong>
          </div>
          <div style={{ height: 8, background: 'rgba(10,10,10,0.06)', borderRadius: 4 }}>
            <div style={{ width: `${(value / max) * 100}%`, height: 8, background: YELLOW, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ ...card, textAlign: 'center' }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: INK }}>{value}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { get } = useFetchClient();
  const [rollups, setRollups] = React.useState<Rollup[]>([]);
  const [liveSessions, setLiveSessions] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rollupRes = await get(
          '/content-manager/collection-types/api::analytics-daily-rollup.analytics-daily-rollup?sort[0]=date:desc&pageSize=90&page=1'
        );
        const sessRes = await get(
          '/content-manager/collection-types/api::analytics-session.analytics-session?sort[0]=lastSeen:desc&pageSize=1&page=1'
        );
        if (cancelled) return;
        setRollups((rollupRes.data?.results ?? []) as Rollup[]);
        setLiveSessions(sessRes.data?.pagination?.total ?? 0);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load analytics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [get]);

  const agg = React.useMemo(() => {
    const byPath = {}, byCountry = {}, byDevice = {}, bySection = {}, byReferrer = {};
    const scroll: Record<string, number> = { '25': 0, '50': 0, '75': 0, '100': 0 };
    let sessions = 0, pageviews = 0, events = 0, consentAnalytics = 0, consentAll = 0;
    for (const r of rollups) {
      sessions += r.sessions || 0;
      pageviews += r.pageviews || 0;
      events += r.events || 0;
      consentAnalytics += r.consentAnalytics || 0;
      consentAll += r.consentAll || 0;
      mergeMaps(byPath, r.byPath);
      mergeMaps(byCountry, r.byCountry);
      mergeMaps(byDevice, r.byDevice);
      mergeMaps(bySection, r.bySection);
      mergeMaps(byReferrer, r.byReferrer);
      mergeMaps(scroll, r.scrollDepthBuckets);
    }
    return { byPath, byCountry, byDevice, bySection, byReferrer, scroll, sessions, pageviews, events, consentAnalytics, consentAll };
  }, [rollups]);

  const consentTotal = agg.consentAnalytics + agg.consentAll;
  const consentRate = consentTotal > 0 ? Math.round((consentTotal / Math.max(agg.sessions, consentTotal)) * 100) : 0;
  const trend = [...rollups].reverse().slice(-30);
  const trendMax = trend.reduce((m, r) => Math.max(m, r.sessions || 0), 0) || 1;

  return (
    <main style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Visitor Analytics</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        First-party, consent-based analytics. Figures are aggregated from daily rollups (built nightly). Raw
        per-event/session rows are in Content&nbsp;Manager. No personal IP addresses are stored.
      </p>

      {loading && <p>Loading…</p>}
      {error && (
        <div style={{ ...card, borderColor: '#c00', color: '#c00' }}>
          Couldn’t load analytics: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            <Stat label="Total sessions (recorded)" value={liveSessions} />
            <Stat label={`Sessions (last ${rollups.length} days)`} value={agg.sessions} />
            <Stat label="Pageviews" value={agg.pageviews} />
            <Stat label="Tracked events" value={agg.events} />
            <Stat label="Analytics consent rate" value={`${consentRate}%`} />
          </div>

          <div style={card}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Sessions — last {trend.length} days</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
              {trend.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No rollups yet.</p>}
              {trend.map((r) => (
                <div
                  key={r.date}
                  title={`${r.date}: ${r.sessions} sessions, ${r.pageviews} pageviews`}
                  style={{ flex: 1, height: `${((r.sessions || 0) / trendMax) * 100}%`, background: YELLOW, borderRadius: '3px 3px 0 0', minHeight: 2 }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 16 }}>
            <BarList title="Top pages" rows={topN(agg.byPath)} unit="views" />
            <BarList title="Sections viewed" rows={topN(agg.bySection)} unit="views" />
            <BarList title="Visitors by country" rows={topN(agg.byCountry)} unit="sessions" />
            <BarList title="Devices" rows={topN(agg.byDevice)} unit="sessions" />
            <BarList title="Referrers" rows={topN(agg.byReferrer)} unit="sessions" />
            <BarList
              title="Scroll depth (events)"
              rows={(['25', '50', '75', '100'] as const).map((k) => [`${k}%`, agg.scroll[k] || 0])}
            />
          </div>
        </>
      )}
    </main>
  );
}
