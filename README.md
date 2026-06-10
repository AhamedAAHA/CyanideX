# CyanideX

**Multi-Modal Cyber Threat Forecasting & Intelligence OS**

CyanideX is a defensive, analytical cybersecurity command center that fuses OSINT
collection, AI threat forecasting, voice intelligence, 3D visualisation, anomaly
context and autonomous executive reporting into a single futuristic "security OS".

> ⚠️ **Defensive by design.** CyanideX only collects, analyses and visualises
> *public* threat intelligence. It contains **no** exploitation, malware, phishing
> or attack-automation capabilities.

---

## ✦ Highlights

- **3D Global Threat Globe** — Three.js wireframe planet with pulsing threat nodes,
  animated great-circle attack arcs and severity-driven colour.
- **Bright Data OSINT Engine** — collects leaked-credential chatter, CVE/exploit
  trends, exposed-secret scans, phishing-domain registrations and ransomware mentions.
- **AIML Forecasting** — per-signal category, severity, attack probability, target
  sector, confidence, mitigation and executive summary.
- **Voice Command Intelligence** — Speechmatics + browser SpeechRecognition for
  read-only analyst commands ("show today's highest risk threat").
- **Cyber Risk DNA** — genomic-style behavioural fingerprint of each threat.
- **Cascading Attack Simulation** — animated phishing → leak → access → breach chain.
- **Autonomous Executive Briefing** — AI daily brief with voice playback.
- **Incident Timeline Builder** — cinematic case dossiers.
- **Supabase backend** — 8 tables, role model (Admin/Analyst/Viewer) and RLS.
- **Java OOP module** — `ThreatSignal`, `RiskAnalyzer`, `ForecastEngine`,
  `IncidentReport`, `VoiceCommand`, `SecurityUser`.

Everything runs out-of-the-box on **simulated intelligence** — add API keys to go live.

---

## ✦ Tech Stack

| Layer        | Tech |
|--------------|------|
| Frontend     | Vanilla JS (ES module OOP), HTML, CSS (glassmorphism), Three.js |
| Backend      | Node.js / Express |
| Database/Auth| Supabase (Postgres + RLS) |
| OSINT        | Bright Data API |
| AI           | AIML API |
| Voice        | Speechmatics API |
| Analysis     | Java (OOP module) |

---

## ✦ Project Structure

```
CyanideX/
├── server/                 # Express API + integration services
│   └── src/
│       ├── config/env.js
│       ├── lib/supabase.js
│       ├── data/fallback.js        # simulated intelligence corpus
│       ├── services/               # brightData / aiml / speechmatics / forecasting
│       ├── routes/index.js
│       └── index.js                # serves API + static frontend
├── web/                    # Frontend "OS"
│   ├── index.html          # dark glass login (animated security grid)
│   ├── app.html            # dashboard shell
│   ├── css/                # variables / base / layout / components / auth
│   └── js/
│       ├── core/           # App, Router, ApiClient, Store, EventBus, Component, VoiceController
│       ├── components/     # ThreatGlobe (Three.js)
│       └── pages/          # 9 dashboard pages
├── java/                   # Java OOP analysis module
│   └── src/com/cyanidex/
├── supabase/
│   ├── schema.sql          # 8 tables + roles + RLS
│   └── seed.sql            # optional demo rows
├── .env.example
└── package.json
```

---

## ✦ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) configure integrations
cp .env.example .env        # leave blank to run fully simulated

# 3. Launch the OS
npm run dev
```

Open **http://localhost:4000** — log in with any credentials (demo mode) and pick a
clearance role. The dashboard is served at `/app.html`.

Verify the intelligence pipeline at any time:

```bash
npm run seed                # prints integration status + a sample snapshot
```

---

## ✦ Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL editor (creates tables, roles, triggers, RLS).
3. Optionally run `supabase/seed.sql` for demo rows.
4. Put `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env`.

New auth users are auto-provisioned a `Viewer` profile via a trigger.

---

## ✦ Java OOP Module

```bash
# Requires a JDK (e.g. apt install default-jdk)
javac -d java/out $(find java/src -name "*.java")
java  -cp java/out com.cyanidex.Main
```

Demonstrates encapsulation, inheritance, polymorphism, abstraction (interfaces),
enums with behaviour, builders and composition.

---

## ✦ API Surface (`/api`)

| Endpoint | Purpose |
|----------|---------|
| `GET /status` | integration / service status |
| `GET /overview` | command-center stats + heatmap |
| `GET /globe` | nodes + attack paths + heatmap |
| `GET /osint/signals` | OSINT feed (filterable) |
| `POST /osint/refresh` | recollect intelligence |
| `GET /ai/forecasts` | AI threat forecasts |
| `GET /ai/tomorrow` | predicted attacks |
| `GET /riskdna` | Risk DNA profiles |
| `GET /simulation/cascade` | attack-chain simulation |
| `GET /incidents` / `/incidents/:id` | incident dossiers |
| `GET /briefings/today` | executive briefing |
| `POST /voice/command` | interpret a voice transcript |

---

## ✦ Security & Ethics

CyanideX is intentionally limited to **defensive intelligence**: read-only collection,
analysis, forecasting and visualisation. Voice commands are retrieval-only. No module
performs exploitation, intrusion, malware generation or attack automation. Keep all
API keys in `.env` (git-ignored).

---

*CyanideX OS v1.0 — built for defensive cyber operations.*
