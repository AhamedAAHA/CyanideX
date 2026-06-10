import { Router } from './Router.js';
import { bus } from './EventBus.js';
import { store } from './Store.js';
import { voice } from './VoiceController.js';

import { CommandCenter } from '../pages/CommandCenter.js';
import { ThreatGlobePage } from '../pages/ThreatGlobePage.js';
import { OsintSignals } from '../pages/OsintSignals.js';
import { AiForecasting } from '../pages/AiForecasting.js';
import { RiskDna } from '../pages/RiskDna.js';
import { VoiceIntelligence } from '../pages/VoiceIntelligence.js';
import { IncidentReports } from '../pages/IncidentReports.js';
import { ExecutiveBriefings } from '../pages/ExecutiveBriefings.js';
import { Settings } from '../pages/Settings.js';

/**
 * App — boots the CyanideX OS shell: builds the navigation rail and
 * topbar, configures the router, and wires global voice + session.
 */
export class App {
  constructor(root) {
    this.root = root;
    this.session = store.session;
    if (!this.session) { window.location.href = 'index.html'; return; }

    this.nav = [
      { group: 'Operations', items: [
        { path: '/command-center', label: 'Command Center', ico: '◈', title: 'Command Center', page: CommandCenter },
        { path: '/globe', label: '3D Threat Globe', ico: '◍', title: '3D Threat Globe', page: ThreatGlobePage },
        { path: '/osint', label: 'OSINT Signals', ico: '⛗', title: 'OSINT Intelligence', page: OsintSignals },
      ]},
      { group: 'Intelligence', items: [
        { path: '/forecasting', label: 'AI Forecasting', ico: '◢', title: 'AI Threat Forecasting', page: AiForecasting },
        { path: '/risk-dna', label: 'Risk DNA', ico: '⬡', title: 'Cyber Risk DNA', page: RiskDna },
        { path: '/incidents', label: 'Incident Reports', ico: '⚑', title: 'Incident Reports', page: IncidentReports },
        { path: '/briefings', label: 'Executive Briefings', ico: '✦', title: 'Executive Briefings', page: ExecutiveBriefings },
      ]},
      { group: 'Interface', items: [
        { path: '/voice', label: 'Voice Intelligence', ico: '◉', title: 'Voice Intelligence', page: VoiceIntelligence },
        { path: '/settings', label: 'Settings', ico: '⚙', title: 'Settings', page: Settings },
      ]},
    ];

    this.routes = {};
    this.nav.flatMap((g) => g.items).forEach((i) => {
      this.routes[i.path] = { title: i.title, factory: () => new i.page() };
    });
  }

  start() {
    if (!this.session) return;
    this.renderShell();
    this.router = new Router(this.routes, document.getElementById('view'));
    this.wire();
    this.router.start();
  }

  renderShell() {
    const initials = (this.session.name || 'OP').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    this.root.innerHTML = `
      <div class="cx-backdrop"></div>
      <div class="cx-scanlines"></div>
      <div class="os">
        <aside class="rail" id="rail">
          <div class="brand" style="flex-direction:column;align-items:flex-start;gap:2px">
            <span class="cx-logo cx-logo--rail" role="img" aria-label="CyanideX"></span>
            <div class="ver" style="padding-left:4px">THREAT FORECASTING OS · v1.0</div>
          </div>
          ${this.nav.map((g) => `
            <div class="nav-group-label">${g.group}</div>
            ${g.items.map((i) => `
              <a class="nav-item" href="#${i.path}" data-path="${i.path}">
                <span class="ico">${i.ico}</span><span>${i.label}</span>
              </a>`).join('')}
          `).join('')}
          <div class="rail-foot">
            <div>OPERATOR · ${this.session.role.toUpperCase()}</div>
            <div class="status-line"><span class="status-dot"></span> ALL SYSTEMS NOMINAL</div>
          </div>
        </aside>

        <header class="topbar">
          <button class="btn btn--ghost btn--sm" id="rail-toggle" style="display:none">☰</button>
          <div>
            <div class="page-title" id="page-title">Command Center</div>
            <div class="crumb" id="crumb">CYANIDEX // OPERATIONS</div>
          </div>
          <div class="spacer"></div>
          <div class="posture" id="posture-badge">POSTURE · —</div>
          <div class="clock" id="clock">--:--:--</div>
          <button class="mic-btn" id="topbar-mic" title="Voice command">◉</button>
          <div class="avatar" id="avatar" title="${this.session.name} · ${this.session.role}">${initials}</div>
        </header>

        <main class="view" id="view"></main>
      </div>`;
  }

  wire() {
    // Active nav highlight + titles
    bus.on('route:change', ({ path, title }) => {
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('is-active', n.dataset.path === path));
      document.getElementById('page-title').textContent = title;
      const group = this.nav.find((g) => g.items.some((i) => i.path === path));
      document.getElementById('crumb').textContent = `CYANIDEX // ${(group?.group || 'OPERATIONS').toUpperCase()}`;
      document.getElementById('rail')?.classList.remove('is-open');
    });

    // Posture badge
    bus.on('posture', (p) => { document.getElementById('posture-badge').textContent = 'POSTURE · ' + p; });

    // Voice
    const mic = document.getElementById('topbar-mic');
    mic.addEventListener('click', () => voice.toggle());
    bus.on('voice:listening', (v) => mic.classList.toggle('is-live', v));
    bus.on('voice:result', (r) => { if (r.intent !== 'unknown') this.handleVoiceNav(r.intent); });
    // If speech capture isn't available, send the operator to the text console.
    bus.on('voice:unsupported', () => this.router.navigate('/voice'));

    // Avatar -> logout
    document.getElementById('avatar').addEventListener('click', () => {
      if (confirm('End CyanideX session?')) { store.clearSession(); window.location.href = 'index.html'; }
    });

    // Mobile rail
    const toggle = document.getElementById('rail-toggle');
    if (window.innerWidth <= 900) toggle.style.display = 'inline-block';
    toggle.addEventListener('click', () => document.getElementById('rail').classList.toggle('is-open'));

    // Clock
    const tick = () => { document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-GB') + ' UTC'; };
    tick(); setInterval(tick, 1000);
  }

  handleVoiceNav(intent) {
    const map = {
      highest_risk: '/osint', executive_briefing: '/briefings',
      explain_ransomware: '/osint', region_risk: '/globe', incident_report: '/incidents',
    };
    if (map[intent]) this.router.navigate(map[intent]);
  }
}
