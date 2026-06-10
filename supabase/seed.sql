-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CyanideX — Seed data (demo intelligence)                      ║
-- ║  Optional. Run after schema.sql to populate sample signals.    ║
-- ║  Note: the Node OS also generates a live simulated corpus, so  ║
-- ║  seeding is only needed if you want persisted demo rows.       ║
-- ╚══════════════════════════════════════════════════════════════╝

insert into public.threat_signals
  (id, category, headline, source, sector, region, city, lat, lon, severity, confidence, tags, url)
values
  ('SIG-DEMO-1', 'Ransomware', 'NebulaLock crew lists new Healthcare victim', 'dark-web-index', 'Healthcare', 'EU', 'Frankfurt', 50.11, 8.68, 9.1, 92, '{apt,targeted}', 'https://intel.local/source/dark-web-index/demo1'),
  ('SIG-DEMO-2', 'Credential Leak', '18,402 credentials surfaced for Finance subdomain', 'breach-forum-tracker', 'Finance', 'NA', 'Ashburn', 39.04, -77.49, 8.4, 88, '{high-velocity}', 'https://intel.local/source/breach-forum-tracker/demo2'),
  ('SIG-DEMO-3', 'Exposed Secret', 'Live API key committed to public Technology repository', 'github-secret-scan', 'Technology', 'APAC', 'Singapore', 1.35, 103.81, 7.2, 95, '{automated}', 'https://intel.local/source/github-secret-scan/demo3'),
  ('SIG-DEMO-4', 'Phishing Campaign', 'Lookalike domain registered impersonating Government portal', 'dns-intel', 'Government', 'MEA', 'Tel Aviv', 32.08, 34.78, 6.6, 79, '{opportunistic}', 'https://intel.local/source/dns-intel/demo4'),
  ('SIG-DEMO-5', 'Vulnerability Exploit', 'PoC published for CVE-2026-4821 affecting Energy appliances', 'cve-feed', 'Energy', 'NA', 'San Jose', 37.33, -121.89, 8.8, 90, '{targeted}', 'https://intel.local/source/cve-feed/demo5')
on conflict (id) do nothing;

insert into public.ai_analysis
  (id, signal_id, threat_category, severity_score, severity_band, attack_probability, target_sector, confidence, recommended_mitigation, executive_summary, model)
values
  ('AI-DEMO-1', 'SIG-DEMO-1', 'Ransomware', 9.1, 'Critical', 91, 'Healthcare', 92,
   'Enforce offline immutable backups; segment networks; rotate privileged credentials.',
   'Critical ransomware indicator affecting Healthcare in Frankfurt (EU). ~91% escalation likelihood within 72h.',
   'cyanidex-sim-forecaster')
on conflict (id) do nothing;

insert into public.executive_briefings
  (id, title, headline, predicted_attacks, recommended_actions, war_room_summary)
values
  ('BRIEF-DEMO-1', 'CyanideX Daily Cyber Briefing — Demo',
   'Ransomware activity leads today''s global threat picture; EU carries the highest regional risk index.',
   '["Elevated probability of ransomware against Healthcare in 24-48h.", "Continued credential-reuse pressure across EU."]',
   '["Validate MFA on admin portals.", "Confirm backup immutability.", "Brief Healthcare unit on phishing lures."]',
   'War-room status: 2 critical indicators under watch. Global posture ELEVATED.')
on conflict (id) do nothing;
