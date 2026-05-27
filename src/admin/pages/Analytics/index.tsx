/**
 * Visitor Analytics dashboard (admin menu link → /analytics).
 *
 * Reads the pre-aggregated `analytics-daily-rollup` rows (built nightly) +
 * a live sample of `analytics-session` rows through the already-authed
 * content-manager admin API, and renders Recharts visualisations:
 * KPI cards, a sessions/pageviews line chart, device + consent donut
 * charts, top-pages / country / section / referrer bar charts, and a
 * scroll-depth chart. Falls back to the live session sample when no
 * daily rollups exist yet (e.g. before the first nightly cron run).
 */
import * as React from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const YELLOW = '#F8BD26';
const INK = '#0A0A0A';
const PALETTE = ['#F8BD26', '#0A0A0A', '#D6A11C', '#8C6F00', '#BFBFBF', '#5A4900', '#E8E2D0'];

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

interface SessionRow {
  country?: string | null;
  deviceType?: string | null;
  consentLevel?: string | null;
  referrerHost?: string | null;
  pageviewCount?: number;
}

function mergeMaps(target: Record<string, number>, src?: Record<string, number>) {
  if (!src) return;
  for (const k of Object.keys(src)) target[k] = (target[k] || 0) + (src[k] || 0);
}
function bump(m: Record<string, number>, k?: string | null) {
  if (!k) return;
  m[k] = (m[k] || 0) + 1;
}
function toPie(map: Record<string, number>, n = 6) {
  const e = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const top = e.slice(0, n).map(([name, value]) => ({ name: name || '(none)', value }));
  const rest = e.slice(n).reduce((s, [, v]) => s + v, 0);
  if (rest) top.push({ name: 'Other', value: rest });
  return top;
}
function toBars(map: Record<string, number>, n = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, value]) => ({ name: name || '(none)', value }));
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(10,10,10,0.1)',
  borderRadius: 10,
  padding: 20,
  boxShadow: '0 1px 2px rgba(10,10,10,0.04), 0 8px 24px rgba(10,10,10,0.06)',
};

function Panel({ title, children, height = 300 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>{title}</h3>
      <div style={{ width: '100%', height }}>{children}</div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ ...cardStyle, padding: 18 }}>
      <div style={{ fontSize: 13, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: INK, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const Empty = ({ msg }: { msg: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 13, textAlign: 'center', padding: '0 16px' }}>
    {msg}
  </div>
);

function HBar({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Panel title={title} height={Math.max(160, data.length * 34 + 20)}>
      {data.length ? (
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.07)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
            <Tooltip />
            <Bar dataKey="value" fill={YELLOW} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Empty msg="No data yet." />
      )}
    </Panel>
  );
}

export default function AnalyticsPage() {
  const { get } = useFetchClient();
  const [rollups, setRollups] = React.useState<Rollup[]>([]);
  const [sessions, setSessions] = React.useState<SessionRow[]>([]);
  const [totals, setTotals] = React.useState({ sessions: 0, events: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cm = '/content-manager/collection-types';
        const [rollupRes, sessRes, evtRes] = await Promise.all([
          get(`${cm}/api::analytics-daily-rollup.analytics-daily-rollup?sort[0]=date:desc&pageSize=90&page=1`),
          get(`${cm}/api::analytics-session.analytics-session?sort[0]=lastSeen:desc&pageSize=100&page=1`),
          get(`${cm}/api::analytics-event.analytics-event?pageSize=1&page=1`),
        ]);
        if (cancelled) return;
        setRollups((rollupRes.data?.results ?? []) as Rollup[]);
        setSessions((sessRes.data?.results ?? []) as SessionRow[]);
        setTotals({
          sessions: sessRes.data?.pagination?.total ?? 0,
          events: evtRes.data?.pagination?.total ?? 0,
        });
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

  const d = React.useMemo(() => {
    const byPath: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const bySection: Record<string, number> = {};
    const byReferrer: Record<string, number> = {};
    const scroll: Record<string, number> = { '25': 0, '50': 0, '75': 0, '100': 0 };
    let pageviews = 0;
    let events = 0;
    let consentAnalytics = 0;
    let consentAll = 0;
    const haveRollups = rollups.length > 0 && rollups.some((r) => r.sessions > 0);

    for (const r of rollups) {
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

    // Before the first rollup, derive breakdowns from the live session sample.
    if (!haveRollups) {
      for (const s of sessions) {
        bump(byCountry, s.country);
        bump(byDevice, s.deviceType);
        bump(byReferrer, s.referrerHost);
        if (s.consentLevel === 'all') consentAll += 1;
        else if (s.consentLevel === 'analytics') consentAnalytics += 1;
        pageviews += s.pageviewCount || 0;
      }
    }

    const series = [...rollups]
      .reverse()
      .map((r) => ({ date: (r.date || '').slice(5), sessions: r.sessions || 0, pageviews: r.pageviews || 0, events: r.events || 0 }));

    return { byPath, byCountry, byDevice, bySection, byReferrer, scroll, pageviews, events, consentAnalytics, consentAll, series };
  }, [rollups, sessions]);

  const consentTotal = d.consentAnalytics + d.consentAll;
  const consentRate = totals.sessions > 0 ? Math.round((consentTotal / totals.sessions) * 100) : 0;
  const pagesPerSession = totals.sessions > 0 ? (d.pageviews / totals.sessions).toFixed(1) : '0';
  const countriesReached = Object.keys(d.byCountry).length;

  const devicePie = toPie(d.byDevice, 5);
  const consentPie = [
    { name: 'Analytics', value: d.consentAnalytics },
    { name: 'All (Analytics + Marketing)', value: d.consentAll },
  ].filter((x) => x.value > 0);
  const scrollBars = (['25', '50', '75', '100'] as const).map((k) => ({ name: `${k}%`, value: d.scroll[k] || 0 }));

  const grid2: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: 16,
    marginTop: 16,
  };

  return (
    <main style={{ padding: '32px 40px', maxWidth: 1280, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Visitor Analytics</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        First-party, consent-based analytics. No personal IP addresses are stored. Time-series uses nightly rollups;
        breakdowns fall back to the latest sessions until the first rollup is built.
      </p>

      {loading && <p>Loading…</p>}
      {error && <div style={{ ...cardStyle, borderColor: '#c00', color: '#c00' }}>Couldn’t load analytics: {error}</div>}

      {!loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 14, marginBottom: 8 }}>
            <Kpi label="Total sessions" value={totals.sessions} />
            <Kpi label="Pageviews" value={d.pageviews} />
            <Kpi label="Tracked events" value={totals.events} />
            <Kpi label="Pages / session" value={pagesPerSession} />
            <Kpi label="Analytics consent" value={`${consentRate}%`} sub={`${consentTotal} of ${totals.sessions}`} />
            <Kpi label="Countries reached" value={countriesReached} />
          </div>

          <div style={{ ...cardStyle, marginTop: 16 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Sessions &amp; pageviews over time</h3>
            <div style={{ width: '100%', height: 300 }}>
              {d.series.length ? (
                <ResponsiveContainer>
                  <LineChart data={d.series} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.07)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sessions" stroke={YELLOW} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="pageviews" stroke={INK} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Empty msg="Daily rollups build overnight (02:15 UTC). The line chart populates after the first run." />
              )}
            </div>
          </div>

          <div style={grid2}>
            <Panel title="Tracked events per day">
              {d.series.length ? (
                <ResponsiveContainer>
                  <AreaChart data={d.series} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="evt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={YELLOW} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={YELLOW} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.07)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="events" stroke={YELLOW} fill="url(#evt)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Empty msg="Awaiting the first daily rollup." />
              )}
            </Panel>

            <Panel title="Scroll depth reached (engagement)">
              <ResponsiveContainer>
                <BarChart data={scrollBars} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.07)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={YELLOW} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div style={grid2}>
            <Panel title="Devices">
              {devicePie.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={devicePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {devicePie.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty msg="No device data yet." />
              )}
            </Panel>

            <Panel title="Consent level">
              {consentPie.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={consentPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {consentPie.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty msg="No consent data yet." />
              )}
            </Panel>
          </div>

          <div style={grid2}>
            <HBar title="Top pages (pageviews)" data={toBars(d.byPath)} />
            <HBar title="Visitors by country (sessions)" data={toBars(d.byCountry)} />
          </div>
          <div style={grid2}>
            <HBar title="Sections viewed" data={toBars(d.bySection)} />
            <HBar title="Referrers" data={toBars(d.byReferrer)} />
          </div>
        </>
      )}
    </main>
  );
}
