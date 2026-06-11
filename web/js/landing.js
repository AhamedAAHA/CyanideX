import { CyberGlobe } from './components/CyberGlobe.js';
import { AuthGate, appUrl } from './core/authGuard.js';

/* ── Mobile nav toggle ──────────────────────────────────── */
const menuBtn = document.getElementById('lp-menu-btn');
const menu = document.getElementById('lp-nav-menu');

function setMenu(open) {
  menuBtn?.setAttribute('aria-expanded', String(open));
  menuBtn?.classList.toggle('is-open', open);
  menu?.classList.toggle('is-open', open);
}

menuBtn?.addEventListener('click', () => {
  setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
});
menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', (e) => {
  if (!menu?.classList.contains('is-open')) return;
  if (menu.contains(e.target) || menuBtn?.contains(e.target)) return;
  setMenu(false);
});

/* ── 3D globe (contained, with loading + error fallbacks) ── */
const stage = document.getElementById('globe-stage');
const loadingEl = document.getElementById('globe-loading');
const errorEl = document.getElementById('globe-error');
const stateEl = document.getElementById('globe-state');

function setGlobeState(text, live) {
  if (!stateEl) return;
  stateEl.innerHTML = `<span class="lp-dot${live ? '' : ' is-off'}"></span> ${text}`;
}

let globe = null;
try {
  globe = new CyberGlobe(stage, {
    onReady: () => {
      loadingEl?.classList.add('hidden');
      setGlobeState('Live', true);
    },
    onError: () => {
      loadingEl?.classList.add('hidden');
      errorEl?.classList.remove('hidden');
      setGlobeState('Offline', false);
    },
  });
} catch (err) {
  console.log('[v0] globe construction failed:', err.message);
  loadingEl?.classList.add('hidden');
  errorEl?.classList.remove('hidden');
  setGlobeState('Offline', false);
}

// Safety net: if WebGL never paints a frame, show the static fallback.
setTimeout(() => {
  if (loadingEl && !loadingEl.classList.contains('hidden')) {
    loadingEl.classList.add('hidden');
    errorEl?.classList.remove('hidden');
    setGlobeState('Offline', false);
  }
}, 6000);

/* ── Helpers ────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sevClass(sev) {
  if (sev >= 8) return 'crit';
  if (sev >= 6) return 'high';
  if (sev >= 4) return 'med';
  return 'low';
}
function relTime(iso) {
  if (!iso) return 'now';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/* ── Live stats (no fake values — fall back to status words) ── */
fetch('/api/overview')
  .then((r) => r.json())
  .then((d) => {
    const s = d.stats || {};
    if (s.total_signals != null) $('stat-signals').textContent = s.total_signals;
    if (s.critical_signals != null) $('stat-critical').textContent = s.critical_signals;
    if (s.global_posture) $('stat-posture').textContent = s.global_posture;
    if (s.highest_risk_region) $('stat-region').textContent = s.highest_risk_region;

    if (d.briefing_headline) $('brief-headline').textContent = d.briefing_headline;
    if (d.war_room_summary) $('brief-summary').textContent = d.war_room_summary;
    $('brief-tag').textContent = 'Live';
  })
  .catch(() => {
    $('brief-headline').textContent = 'Executive briefing stream is reconnecting.';
    $('brief-summary').textContent = 'Live intelligence will populate as soon as the pipeline responds.';
  });

/* ── Live threat feed ───────────────────────────────────── */
fetch('/api/osint/signals')
  .then((r) => r.json())
  .then((d) => {
    const signals = (d.signals || []).slice(0, 7);
    const feed = $('threat-feed');
    if (!feed || !signals.length) return;
    feed.innerHTML = signals
      .map(
        (s) => `
        <li class="lp-feed-item">
          <span class="lp-feed-dot lp-feed-dot--${sevClass(s.severity)}"></span>
          <div class="lp-feed-main">
            <p class="lp-feed-headline">${esc(s.headline)}</p>
            <div class="lp-feed-meta">
              <span class="lp-feed-cat">${esc(s.category)}</span>
              <span>${esc(s.city)} · ${esc(s.region)}</span>
              <time>${esc(relTime(s.first_seen))}</time>
            </div>
          </div>
          <span class="sev sev--${sevClass(s.severity)}">${Number(s.severity).toFixed(1)}</span>
        </li>`
      )
      .join('');
    $('feed-live').innerHTML = '<span class="lp-dot"></span> Streaming';
  })
  .catch(() => {
    const feed = $('threat-feed');
    if (feed) feed.innerHTML = '<li class="lp-feed-item lp-feed-empty">Threat feed reconnecting…</li>';
    $('feed-live').innerHTML = '<span class="lp-dot is-off"></span> Offline';
  });

/* ── Risk DNA preview ───────────────────────────────────── */
fetch('/api/riskdna')
  .then((r) => r.json())
  .then((d) => {
    const dna = (d.profiles || [])[0];
    if (!dna) return;
    $('dna-origin').textContent = dna.origin || '—';
    $('dna-motivation').textContent = dna.motivation || '—';
    $('dna-method').textContent = dna.attack_method || '—';
    $('dna-industry').textContent = dna.affected_industry || '—';
    $('dna-tag').textContent = 'Profiled';

    const bars = document.querySelectorAll('#risk-dna-strands .lp-dna-bar');
    (dna.dna_strands || []).forEach((strand, i) => {
      if (bars[i]) bars[i].style.setProperty('--h', `${Math.round((strand.weight || 0.5) * 100)}%`);
    });
  })
  .catch(() => {
    $('dna-tag').textContent = 'Reconnecting';
  });

/* ── Attack chain preview ───────────────────────────────── */
fetch('/api/simulation/cascade')
  .then((r) => r.json())
  .then((d) => {
    const stages = (d.stages || []).slice(0, 4);
    const chain = $('attack-chain');
    if (!chain || !stages.length) return;
    chain.innerHTML = stages
      .map(
        (s) => `
        <li class="lp-chain-step">
          <span class="lp-chain-order">${s.order}</span>
          <div class="lp-chain-main">
            <p class="lp-chain-stage">${esc(s.stage)}</p>
            <p class="lp-chain-vector">${esc(s.vector)}</p>
          </div>
          <span class="lp-chain-prob">${s.probability}%</span>
        </li>`
      )
      .join('');
    $('chain-tag').textContent = 'Simulated';
  })
  .catch(() => {
    $('chain-tag').textContent = 'Reconnecting';
  });

/* ── Auth-aware command center entry ────────────────────── */
const gate = new AuthGate();
const enterBtn = $('enter-command-center');
enterBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  const auth = await gate.ensureAuthenticated({ redirect: false });
  window.location.href = auth ? appUrl('/command-center') : 'signin.html';
});

(async () => {
  try {
    const auth = await gate.restoreIfAuthenticated({ redirectOnFailure: false });
    if (auth) {
      const enter = document.createElement('a');
      enter.href = appUrl('/command-center');
      enter.className = 'btn btn--toxic lp-btn';
      enter.textContent = 'Resume Session';
      document.querySelector('.lp-actions')?.appendChild(enter);
    }
  } catch { /* not signed in — ignore */ }
})();

window.addEventListener('beforeunload', () => globe?.destroy());
