/**
 * Simulated intelligence corpus.
 *
 * This is *defensive, analytical* sample data used so the entire
 * CyanideX OS is fully explorable without live API keys. None of
 * this performs or facilitates real attacks — it models threat
 * intelligence the way a SOC analyst would review it.
 */

export const REGIONS = [
  { id: 'NA', name: 'North America', lat: 39.0, lon: -98.0 },
  { id: 'SA', name: 'South America', lat: -14.0, lon: -55.0 },
  { id: 'EU', name: 'Europe', lat: 50.0, lon: 10.0 },
  { id: 'MEA', name: 'Middle East & Africa', lat: 8.0, lon: 24.0 },
  { id: 'APAC', name: 'Asia Pacific', lat: 15.0, lon: 105.0 },
  { id: 'OCE', name: 'Oceania', lat: -25.0, lon: 134.0 },
];

const CITIES = [
  { name: 'Ashburn', lat: 39.04, lon: -77.49, region: 'NA' },
  { name: 'San Jose', lat: 37.33, lon: -121.89, region: 'NA' },
  { name: 'São Paulo', lat: -23.55, lon: -46.63, region: 'SA' },
  { name: 'Frankfurt', lat: 50.11, lon: 8.68, region: 'EU' },
  { name: 'Amsterdam', lat: 52.37, lon: 4.9, region: 'EU' },
  { name: 'London', lat: 51.5, lon: -0.12, region: 'EU' },
  { name: 'Tel Aviv', lat: 32.08, lon: 34.78, region: 'MEA' },
  { name: 'Lagos', lat: 6.52, lon: 3.37, region: 'MEA' },
  { name: 'Singapore', lat: 1.35, lon: 103.81, region: 'APAC' },
  { name: 'Tokyo', lat: 35.68, lon: 139.69, region: 'APAC' },
  { name: 'Mumbai', lat: 19.07, lon: 72.87, region: 'APAC' },
  { name: 'Sydney', lat: -33.86, lon: 151.2, region: 'OCE' },
];

export const THREAT_CATEGORIES = [
  'Ransomware',
  'Phishing Campaign',
  'Credential Leak',
  'Exposed Secret',
  'Vulnerability Exploit',
  'DDoS',
  'Supply Chain',
  'Insider Risk',
  'Zero-Day Chatter',
];

export const SECTORS = [
  'Finance',
  'Healthcare',
  'Energy',
  'Government',
  'Manufacturing',
  'Technology',
  'Retail',
  'Telecom',
  'Education',
];

const SOURCES = [
  'paste-monitor',
  'dark-web-index',
  'cve-feed',
  'github-secret-scan',
  'breach-forum-tracker',
  'social-osint',
  'news-aggregator',
  'dns-intel',
];

const pick = (arr, n = 1) => {
  const c = [...arr];
  const out = [];
  for (let i = 0; i < n && c.length; i++) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  return n === 1 ? out[0] : out;
};
const rand = (min, max) => Math.round((min + Math.random() * (max - min)) * 100) / 100;
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

let _seq = 4096;
const uid = (p) => `${p}-${(_seq++).toString(16).toUpperCase()}`;

const SIGNAL_TEMPLATES = [
  { cat: 'Credential Leak', headline: '{n} credentials surfaced for {sector} subdomain', src: 'breach-forum-tracker' },
  { cat: 'Ransomware', headline: '{group} ransomware crew lists new {sector} victim', src: 'dark-web-index' },
  { cat: 'Exposed Secret', headline: 'Live API key committed to public {sector} repository', src: 'github-secret-scan' },
  { cat: 'Phishing Campaign', headline: 'Lookalike domain registered impersonating {sector} portal', src: 'dns-intel' },
  { cat: 'Vulnerability Exploit', headline: 'PoC published for {cve} affecting {sector} appliances', src: 'cve-feed' },
  { cat: 'Zero-Day Chatter', headline: 'Underground chatter referencing unpatched {sector} edge device', src: 'social-osint' },
  { cat: 'Supply Chain', headline: 'Compromised dependency pushed to {sector} build pipeline', src: 'paste-monitor' },
];

const RANSOM_GROUPS = ['NebulaLock', 'GraphiteSpider', 'RustHydra', 'PaleViper', 'CobaltMoth'];

export function generateSignals(count = 48) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const tpl = pick(SIGNAL_TEMPLATES);
    const city = pick(CITIES);
    const sector = pick(SECTORS);
    const headline = tpl.headline
      .replace('{n}', randInt(120, 48000).toLocaleString())
      .replace('{sector}', sector)
      .replace('{group}', pick(RANSOM_GROUPS))
      .replace('{cve}', `CVE-2026-${randInt(1000, 9999)}`);
    const severity = rand(2.5, 9.8);
    out.push({
      id: uid('SIG'),
      category: tpl.cat,
      headline,
      source: tpl.src,
      sector,
      region: city.region,
      city: city.name,
      lat: city.lat,
      lon: city.lon,
      severity,
      confidence: randInt(54, 98),
      first_seen: new Date(Date.now() - randInt(0, 72) * 3600_000).toISOString(),
      tags: pick(['apt', 'commodity', 'opportunistic', 'targeted', 'automated', 'high-velocity'], 2),
      url: `https://intel.local/source/${pick(SOURCES)}/${uid('REF').toLowerCase()}`,
    });
  }
  return out.sort((a, b) => b.severity - a.severity);
}

export function generateAttackPaths(signals, count = 14) {
  const paths = [];
  for (let i = 0; i < count; i++) {
    const a = pick(CITIES);
    let b = pick(CITIES);
    while (b.name === a.name) b = pick(CITIES);
    paths.push({
      id: uid('PATH'),
      from: { name: a.name, lat: a.lat, lon: a.lon, region: a.region },
      to: { name: b.name, lat: b.lat, lon: b.lon, region: b.region },
      category: pick(THREAT_CATEGORIES),
      intensity: rand(0.3, 1),
      severity: rand(3, 9.5),
    });
  }
  return paths;
}

export function regionRiskHeatmap(signals) {
  return REGIONS.map((r) => {
    const inRegion = signals.filter((s) => s.region === r.id);
    const score = inRegion.length
      ? inRegion.reduce((a, s) => a + s.severity, 0) / inRegion.length
      : rand(2, 6);
    return {
      ...r,
      signal_count: inRegion.length,
      risk_score: Math.round(score * 10) / 10,
      trend: pick(['rising', 'stable', 'declining', 'spiking']),
    };
  });
}

const MITIGATIONS = {
  Ransomware: 'Enforce offline, immutable backups; segment flat networks; rotate privileged credentials and validate EDR coverage on file servers.',
  'Phishing Campaign': 'Deploy DMARC/DKIM enforcement, sinkhole the lookalike domain, and push a targeted awareness alert to the impersonated business unit.',
  'Credential Leak': 'Force password resets for affected identities, enable phishing-resistant MFA, and monitor for credential-stuffing against exposed endpoints.',
  'Exposed Secret': 'Revoke and rotate the leaked key immediately, scan commit history, and enable pre-commit secret scanning in CI.',
  'Vulnerability Exploit': 'Prioritise patching of internet-facing instances, apply virtual patching at the WAF, and hunt for prior exploitation indicators.',
  DDoS: 'Confirm upstream scrubbing is active, tune rate limits, and pre-stage failover capacity for critical services.',
  'Supply Chain': 'Pin and verify dependency hashes, freeze the affected pipeline, and review build artifacts for tampering.',
  'Insider Risk': 'Review privileged access logs, apply least-privilege scoping, and engage HR/legal per insider-risk policy.',
  'Zero-Day Chatter': 'Increase logging on the referenced device class, isolate where feasible, and watch vendor advisories for emergency patches.',
};

export function analyzeSignal(signal) {
  const sevBand = signal.severity >= 8 ? 'Critical' : signal.severity >= 6 ? 'High' : signal.severity >= 4 ? 'Medium' : 'Low';
  const probability = Math.min(98, Math.round(signal.severity * 9 + (signal.confidence - 60) / 2));
  return {
    id: uid('AI'),
    signal_id: signal.id,
    threat_category: signal.category,
    severity_score: signal.severity,
    severity_band: sevBand,
    attack_probability: Math.max(8, probability),
    target_sector: signal.sector,
    confidence: signal.confidence,
    recommended_mitigation: MITIGATIONS[signal.category] || 'Escalate to tier-2 analyst for manual triage and containment review.',
    executive_summary: `${sevBand} ${signal.category.toLowerCase()} indicator affecting the ${signal.sector} sector in ${signal.city} (${signal.region}). Source telemetry from ${signal.source} suggests a ${probability}% likelihood of escalation within 72h. Recommend immediate analyst review and containment posture.`,
    generated_at: new Date().toISOString(),
    model: 'cyanidex-sim-forecaster',
  };
}

const MOTIVATIONS = ['Financial', 'Espionage', 'Hacktivism', 'Disruption', 'Data Theft'];
const ORIGINS = ['Eastern Europe', 'East Asia', 'Unknown / Tor-routed', 'Domestic', 'West Africa', 'South Asia'];
const METHODS = ['Spear-phishing', 'Exposed RDP', 'Vulnerable VPN appliance', 'Stolen session token', 'Malicious dependency', 'Watering-hole'];

export function riskDna(signal) {
  return {
    id: uid('DNA'),
    signal_id: signal.id,
    origin: pick(ORIGINS),
    motivation: pick(MOTIVATIONS),
    attack_method: pick(METHODS),
    affected_industry: signal.sector,
    timeline: `${randInt(2, 18)}d observed activity`,
    confidence_score: signal.confidence,
    possible_impact: pick([
      'Operational outage of customer-facing services',
      'Exposure of regulated PII / PHI records',
      'Financial fraud via business email compromise',
      'Intellectual property exfiltration',
      'Regulatory penalty and reputational damage',
    ]),
    mitigation_strategy: MITIGATIONS[signal.category] || 'Apply layered containment and monitor for lateral movement.',
    dna_strands: Array.from({ length: 8 }).map(() => ({
      marker: pick(['ttp', 'infra', 'tooling', 'persistence', 'exfil', 'recon']),
      weight: rand(0.2, 1),
    })),
  };
}

export function cascadeSimulation(signal) {
  const stages = [
    { stage: 'Initial Access', vector: 'Phishing email with credential-harvesting page', impact: 12 },
    { stage: 'Credential Leak', vector: 'Harvested employee login reused across services', impact: 28 },
    { stage: 'Privilege Escalation', vector: 'Admin console access via reused password', impact: 51 },
    { stage: 'Lateral Movement', vector: 'Pivot into internal database cluster', impact: 74 },
    { stage: 'Data Exfiltration', vector: 'Bulk export of customer records', impact: 88 },
    { stage: 'Public Exposure', vector: 'Stolen data listed on leak forum', impact: 97 },
  ];
  return {
    id: uid('SIM'),
    signal_id: signal?.id || null,
    seed_category: signal?.category || 'Phishing Campaign',
    stages: stages.map((s, i) => ({ ...s, order: i + 1, probability: Math.max(20, 95 - i * 11) })),
  };
}

export function executiveBriefing(signals, analyses, heatmap) {
  const top = signals.slice(0, 5);
  const sectorCounts = {};
  signals.forEach((s) => (sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1));
  const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const hottest = [...heatmap].sort((a, b) => b.risk_score - a.risk_score)[0];

  return {
    id: uid('BRIEF'),
    title: `CyanideX Daily Cyber Briefing — ${new Date().toLocaleDateString()}`,
    generated_at: new Date().toISOString(),
    headline: `${top[0]?.category || 'Multiple'} activity leads today's global threat picture; ${hottest.name} carries the highest regional risk index (${hottest.risk_score}).`,
    top_threats: top.map((t) => ({ id: t.id, category: t.category, headline: t.headline, severity: t.severity, region: t.region })),
    most_targeted_industries: topSectors.map(([s, c]) => ({ sector: s, signals: c })),
    heatmap_summary: heatmap.map((h) => ({ region: h.name, risk: h.risk_score, trend: h.trend })),
    predicted_attacks: [
      `Elevated probability of ${pick(THREAT_CATEGORIES).toLowerCase()} against ${topSectors[0]?.[0] || 'Finance'} in the next 24–48h.`,
      `Continued credential-reuse pressure expected across ${hottest.name}.`,
    ],
    recommended_actions: [
      'Validate MFA coverage on all internet-facing admin portals.',
      'Confirm backup immutability for tier-1 systems.',
      `Brief the ${topSectors[0]?.[0] || 'Finance'} business unit on active phishing lures.`,
      'Pre-stage incident-response on-call for the next operational window.',
    ],
    war_room_summary: `War-room status: ${signals.filter((s) => s.severity >= 8).length} critical indicators under watch. Global posture is ${hottest.risk_score > 7 ? 'ELEVATED' : 'GUARDED'}. Analysts should prioritise ${topSectors[0]?.[0] || 'Finance'} sector telemetry.`,
  };
}

export function incidentReport(signal, analysis, dna) {
  const now = Date.now();
  return {
    id: uid('INC'),
    signal_id: signal.id,
    title: `Incident Report — ${signal.category} (${signal.region})`,
    status: pick(['Open', 'Investigating', 'Contained', 'Monitoring']),
    severity_band: analysis.severity_band,
    opened_at: signal.first_seen,
    timeline: [
      { t: new Date(now - 9 * 3600_000).toISOString(), label: 'First signal detected', detail: `${signal.source} flagged: ${signal.headline}` },
      { t: new Date(now - 7 * 3600_000).toISOString(), label: 'Related sources correlated', detail: 'Cross-referenced 3 additional OSINT sources.' },
      { t: new Date(now - 5 * 3600_000).toISOString(), label: 'AI analysis completed', detail: analysis.executive_summary },
      { t: new Date(now - 3 * 3600_000).toISOString(), label: 'Predicted next step', detail: `Likely progression toward ${pick(['lateral movement', 'data exfiltration', 'privilege escalation'])}.` },
      { t: new Date(now - 1 * 3600_000).toISOString(), label: 'Recommended defense', detail: analysis.recommended_mitigation },
    ],
    risk_dna: dna,
    analyst: pick(['a.okafor', 'm.tanaka', 'l.rossi', 'system']),
  };
}

/** Voice command intent matcher (defensive, read-only commands only). */
const COMMAND_INTENTS = [
  { intent: 'highest_risk', patterns: ['highest risk', 'top threat', 'biggest threat', "today's highest"], response: 'Surfacing the highest-severity threat currently tracked.' },
  { intent: 'executive_briefing', patterns: ['executive', 'briefing', 'cyber brief'], response: 'Generating executive cyber briefing.' },
  { intent: 'explain_ransomware', patterns: ['ransomware'], response: 'Summarising current ransomware activity.' },
  { intent: 'region_risk', patterns: ['apac', 'region', 'europe', 'north america'], response: 'Pulling regional risk breakdown.' },
  { intent: 'incident_report', patterns: ['incident report', 'create incident', 'open incident'], response: 'Drafting a new incident report.' },
];

export function matchVoiceCommand(transcript = '') {
  const t = transcript.toLowerCase();
  const found = COMMAND_INTENTS.find((c) => c.patterns.some((p) => t.includes(p)));
  return {
    id: uid('VOICE'),
    transcript,
    intent: found?.intent || 'unknown',
    response: found?.response || 'Command not recognised. Try "show today\'s highest risk threat".',
    confidence: found ? randInt(82, 99) : randInt(20, 55),
    matched_at: new Date().toISOString(),
  };
}

export const SAMPLE_USERS = [
  { id: 'usr-admin', email: 'admin@cyanidex.io', name: 'Nova Reyes', role: 'Admin' },
  { id: 'usr-analyst', email: 'analyst@cyanidex.io', name: 'Kai Tanaka', role: 'Analyst' },
  { id: 'usr-viewer', email: 'viewer@cyanidex.io', name: 'Sam Okafor', role: 'Viewer' },
];
