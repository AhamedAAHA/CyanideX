import { Router } from './Router.js';
import { bus } from './EventBus.js';
import { store } from './Store.js';
import { logout } from './supabaseAuth.js';
import { voice } from './VoiceController.js';
import { AuthGate, AUTH_REQUIRED_MESSAGE, setAuthNotice } from './authGuard.js';

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
    this.authGate = new AuthGate();
    this.session = store.session;

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

    this.routeAliases = {
      '/dashboard': '/command-center',
      '/intel': '/osint',
      '/signals': '/osint',
      '/forecasts': '/forecasting',
      '/reports': '/incidents',
    };

    this.routes = {};
    this.nav.flatMap((g) => g.items).forEach((i) => {
      this.routes[i.path] = { title: i.title, factory: () => new i.page() };
    });
    Object.entries(this.routeAliases).forEach(([alias, target]) => {
      this.routes[alias] = this.routes[target];
    });
  }

  async start() {
    this.renderLoading('Verifying session...');
    const auth = await this.authGate.hydrateSession();
    if (!auth) return;

    this.session = auth.profile;
    this.renderShell();
    this.router = new Router(this.routes, document.getElementById('view'), {
      beforeResolve: async () => {
        const verified = await this.authGate.ensureAuthenticated({ notice: AUTH_REQUIRED_MESSAGE });
        return Boolean(verified);
      },
    });
    this.wire();
    this.onAuthChange = await this.authGate.handleAuthStateChange(
      (current) => {
        this.session = current.profile;
        this.refreshIdentity(current.profile);
      },
      () => {
        setAuthNotice(AUTH_REQUIRED_MESSAGE);
        window.location.replace('signin.html');
      }
    );
    await this.router.start();
  }

  renderLoading(message) {
    this.root.innerHTML = `
      <div class="cx-backdrop"></div>
      <div class="cx-scanlines"></div>
      <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:rgba(3,6,10,.92);color:var(--text)">
        <div class="glass holo" style="max-width:460px;width:100%;padding:28px 24px;text-align:center">
          <div class="mono" style="font-size:.62rem;letter-spacing:2px;color:var(--cyan);text-transform:uppercase;margin-bottom:10px">CyanideX Security Gate</div>
          <div style="font-family:var(--font-display);font-size:1.05rem;margin-bottom:8px">Authentication Check</div>
          <div class="dim" style="font-size:.9rem;line-height:1.6">${message}</div>
        </div>
      </div>`;
  }

  renderShell() {
    const initials = (this.session.name || 'OP').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    this.root.innerHTML = `
      <div class="cx-backdrop"></div>
      <div class="cx-scanlines"></div>
      <div class="os">
        <aside class="rail" id="rail">
          <div class="brand">
            <a href="index.html" class="brand-logo" title="Back to Main Page">
              <img class="cx-logo cx-logo--rail" src="assets/cyanidex-logo-ui.png" alt="CyanideX" />
            </a>
            <div class="ver">THREAT FORECASTING OS · v1.0</div>
          </div>
          ${this.nav.map((g) => `
            <div class="nav-group-label">${g.group}</div>
            ${g.items.map((i) => `
              <a class="nav-item" href="#${i.path}" data-path="${i.path}">
                <span class="ico">${i.ico}</span><span>${i.label}</span>
              </a>`).join('')}
          `).join('')}
          <div class="rail-foot">
            <div>OPERATOR · ${String(this.session.role || 'Viewer').toUpperCase()}</div>
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
          <button class="btn btn--ghost btn--sm logout-btn" id="logout-btn" type="button">Logout</button>
        </header>

        <main class="view" id="view"></main>
      </div>`;
  }

  wire() {
    // Active nav highlight + titles
    bus.on('route:change', ({ path, title }) => {
      const resolvedPath = this.routeAliases[path] || path;
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('is-active', n.dataset.path === resolvedPath));
      document.getElementById('page-title').textContent = title;
      const group = this.nav.find((g) => g.items.some((i) => i.path === resolvedPath));
      document.getElementById('crumb').textContent = `CYANIDEX // ${(group?.group || 'OPERATIONS').toUpperCase()}`;
      document.getElementById('rail')?.classList.remove('is-open');
    });

    // Posture badge
    bus.on('posture', (p) => { document.getElementById('posture-badge').textContent = 'POSTURE · ' + p; });

    // Voice
    const mic = document.getElementById('topbar-mic');
    if (!voice.supported) {
      mic.disabled = true;
      mic.title = 'Speech input unavailable in this browser';
      mic.style.opacity = '0.45';
      mic.style.cursor = 'not-allowed';
    }
    mic.addEventListener('click', () => voice.toggle());
    bus.on('voice:listening', (v) => mic.classList.toggle('is-live', v));
    bus.on('voice:result', (r) => { if (r.intent !== 'unknown') this.handleVoiceNav(r.intent); });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      if (confirm('End CyanideX session and return to main page?')) logout();
    });

    // Mobile rail
    const toggle = document.getElementById('rail-toggle');
    if (window.innerWidth <= 900) toggle.style.display = 'inline-block';
    toggle.addEventListener('click', () => document.getElementById('rail').classList.toggle('is-open'));

    // Clock
    const tick = () => { document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-GB') + ' UTC'; };
    tick(); setInterval(tick, 1000);
  }

  refreshIdentity(profile) {
    const avatar = document.getElementById('avatar');
    const initials = (profile.name || 'OP').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    if (avatar) {
      avatar.textContent = initials;
      avatar.title = `${profile.name} · ${profile.role}`;
    }
    const rail = document.querySelector('.rail-foot > div');
    if (rail) rail.textContent = `OPERATOR · ${String(profile.role || 'Viewer').toUpperCase()}`;
  }

  handleVoiceNav(intent) {
    const map = {
      highest_risk: '/osint', executive_briefing: '/briefings',
      explain_ransomware: '/osint', region_risk: '/globe', incident_report: '/incidents',
    };
    if (map[intent]) this.router.navigate(map[intent]);
  }
}
