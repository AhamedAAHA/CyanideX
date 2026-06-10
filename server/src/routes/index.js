import { Router } from 'express';
import { env, integrationStatus } from '../config/env.js';
import { pipeline } from '../services/forecasting.service.js';
import { brightData } from '../services/brightData.service.js';
import { aiml } from '../services/aiml.service.js';
import { speechmatics } from '../services/speechmatics.service.js';
import * as fb from '../data/fallback.js';

const router = Router();

const asyncRoute = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[route-error]', err);
    res.status(500).json({ error: err.message });
  });

/* ── System / health ─────────────────────────────────────── */
router.get('/health', (_req, res) => res.json({ status: 'online', os: 'CyanideX', ts: new Date().toISOString() }));

router.get('/status', (_req, res) =>
  res.json({
    integrations: integrationStatus(),
    services: {
      brightData: brightData.status(),
      aiml: aiml.status(),
      speechmatics: speechmatics.status(),
    },
  })
);

/* Public client config (anon key is safe to expose) */
router.get('/config/public', (_req, res) =>
  res.json({
    supabaseUrl: env.supabase.url || null,
    supabaseAnonKey: env.supabase.anonKey || null,
  })
);

/* Ensure public.users profile exists after auth (service role upsert) */
router.post('/auth/ensure-profile', asyncRoute(async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing access token' });
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase service role not configured' });
  }

  const userRes = await fetch(`${env.supabase.url}/auth/v1/user`, {
    headers: { apikey: env.supabase.anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid session' });
  const authUser = await userRes.json();

  const svcHeaders = {
    apikey: env.supabase.serviceRoleKey,
    Authorization: `Bearer ${env.supabase.serviceRoleKey}`,
  };

  const existingRes = await fetch(
    `${env.supabase.url}/rest/v1/users?id=eq.${authUser.id}&select=email,full_name,role`,
    { headers: svcHeaders }
  );
  const existing = await existingRes.json();
  let profile = Array.isArray(existing) ? existing[0] : null;
  const fallbackProfile = {
    email: authUser.email,
    name: authUser.user_metadata?.full_name || (authUser.email || '').split('@')[0] || 'Operator',
    role: 'Viewer',
  };

  if (!profile) {
    const row = {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || '',
      role: 'Viewer',
    };
    const insertRes = await fetch(`${env.supabase.url}/rest/v1/users`, {
      method: 'POST',
      headers: { ...svcHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const inserted = await insertRes.json();
    profile = Array.isArray(inserted) ? inserted[0] : inserted;
    fallbackProfile.email = row.email;
    fallbackProfile.name = row.full_name || fallbackProfile.name;
    fallbackProfile.role = row.role;
  }

  res.json({
    profile: {
      email: profile?.email || fallbackProfile.email,
      name: profile?.full_name || fallbackProfile.name,
      role: profile?.role || fallbackProfile.role,
    },
  });
}));

/* ── Overview / command center ───────────────────────────── */
router.get('/overview', asyncRoute(async (_req, res) => {
  const snap = await pipeline.getSnapshot();
  res.json({
    generated_at: snap.generated_at,
    collection_source: snap.collection_source,
    stats: snap.stats,
    top_signals: snap.signals.slice(0, 8),
    heatmap: snap.heatmap,
    briefing_headline: snap.briefing.headline,
    war_room_summary: snap.briefing.war_room_summary,
  });
}));

/* ── 3D globe data ───────────────────────────────────────── */
router.get('/globe', asyncRoute(async (_req, res) => {
  const snap = await pipeline.getSnapshot();
  res.json({
    nodes: snap.signals.map((s) => ({
      id: s.id, lat: s.lat, lon: s.lon, severity: s.severity,
      category: s.category, city: s.city, region: s.region,
    })),
    paths: snap.attack_paths,
    heatmap: snap.heatmap,
  });
}));

/* ── OSINT signals ───────────────────────────────────────── */
router.get('/osint/signals', asyncRoute(async (req, res) => {
  const snap = await pipeline.getSnapshot();
  let signals = snap.signals;
  const { category, region, sector } = req.query;
  if (category) signals = signals.filter((s) => s.category === category);
  if (region) signals = signals.filter((s) => s.region === region);
  if (sector) signals = signals.filter((s) => s.sector === sector);
  res.json({ count: signals.length, source: snap.collection_source, signals });
}));

router.post('/osint/refresh', asyncRoute(async (_req, res) => {
  const snap = await pipeline.refresh();
  res.json({ refreshed_at: snap.generated_at, count: snap.signals.length });
}));

router.get('/osint/feed', asyncRoute(async (_req, res) => {
  const snap = await pipeline.getSnapshot();
  const item = snap.signals[Math.floor(Math.random() * snap.signals.length)];
  res.json({ item, ts: new Date().toISOString() });
}));

/* ── AI forecasting ──────────────────────────────────────── */
router.get('/ai/forecasts', asyncRoute(async (_req, res) => {
  const snap = await pipeline.getSnapshot();
  res.json({ model: aiml.status().model, forecasts: snap.analyses });
}));

router.get('/ai/forecast/:signalId', asyncRoute(async (req, res) => {
  const snap = await pipeline.getSnapshot();
  const signal = snap.signals.find((s) => s.id === req.params.signalId);
  if (!signal) return res.status(404).json({ error: 'signal not found' });
  res.json(await aiml.analyzeSignal(signal));
}));

router.get('/ai/tomorrow', asyncRoute(async (_req, res) => {
  const snap = await pipeline.getSnapshot();
  res.json({ predictions: snap.briefing.predicted_attacks, posture: snap.stats.global_posture });
}));

/* ── Risk DNA ────────────────────────────────────────────── */
router.get('/riskdna', asyncRoute(async (_req, res) => {
  const snap = await pipeline.getSnapshot();
  res.json({ profiles: snap.risk_dna });
}));

router.get('/riskdna/:signalId', asyncRoute(async (req, res) => {
  const snap = await pipeline.getSnapshot();
  const signal = snap.signals.find((s) => s.id === req.params.signalId);
  if (!signal) return res.status(404).json({ error: 'signal not found' });
  res.json(fb.riskDna(signal));
}));

/* ── Cascade simulation ──────────────────────────────────── */
router.get('/simulation/cascade', asyncRoute(async (req, res) => {
  const snap = await pipeline.getSnapshot();
  const signal = snap.signals.find((s) => s.id === req.query.signalId) || snap.signals[0];
  res.json(fb.cascadeSimulation(signal));
}));

/* ── Incidents ───────────────────────────────────────────── */
router.get('/incidents', asyncRoute(async (_req, res) => {
  const snap = await pipeline.getSnapshot();
  const reports = snap.signals.slice(0, 6).map((s, i) =>
    fb.incidentReport(s, snap.analyses[i] || fb.analyzeSignal(s), snap.risk_dna[i] || fb.riskDna(s))
  );
  res.json({ reports });
}));

router.get('/incidents/:signalId', asyncRoute(async (req, res) => {
  const snap = await pipeline.getSnapshot();
  const signal = snap.signals.find((s) => s.id === req.params.signalId);
  if (!signal) return res.status(404).json({ error: 'signal not found' });
  const analysis = await aiml.analyzeSignal(signal);
  res.json(fb.incidentReport(signal, analysis, fb.riskDna(signal)));
}));

/* ── Executive briefings ─────────────────────────────────── */
router.get('/briefings/today', asyncRoute(async (_req, res) => {
  const snap = await pipeline.getSnapshot();
  res.json(snap.briefing);
}));

/* ── Voice intelligence ──────────────────────────────────── */
router.post('/voice/command', asyncRoute(async (req, res) => {
  const transcript = String(req.body?.transcript || '');
  const interpreted = speechmatics.interpret(transcript);
  const snap = await pipeline.getSnapshot();
  let payload = null;

  switch (interpreted.intent) {
    case 'highest_risk':
      payload = snap.signals[0];
      break;
    case 'executive_briefing':
      payload = snap.briefing;
      break;
    case 'explain_ransomware':
      payload = snap.signals.filter((s) => s.category === 'Ransomware').slice(0, 5);
      break;
    case 'region_risk':
      payload = snap.heatmap;
      break;
    case 'incident_report':
      payload = fb.incidentReport(snap.signals[0], snap.analyses[0] || fb.analyzeSignal(snap.signals[0]), snap.risk_dna[0] || fb.riskDna(snap.signals[0]));
      break;
    default:
      payload = null;
  }
  res.json({ ...interpreted, payload });
}));

router.get('/voice/examples', (_req, res) =>
  res.json({
    examples: [
      "Show today's highest risk threat",
      'Generate executive cyber briefing',
      'Explain ransomware activity',
      'Show APAC region risks',
      'Create incident report',
    ],
  })
);

/* ── Users (demo roles) ──────────────────────────────────── */
router.get('/users', (_req, res) => res.json({ users: fb.SAMPLE_USERS }));

export default router;
