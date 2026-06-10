import { LandingScene } from './components/LandingScene.js';
import { AuthGate, appUrl } from './core/authGuard.js';

const scene = new LandingScene(document.getElementById('landing-3d'));
const gate = new AuthGate();

// Live stats from the intel pipeline
fetch('/api/overview')
  .then((r) => r.json())
  .then((d) => {
    const s = d.stats || {};
    document.getElementById('stat-signals').textContent = s.total_signals ?? '—';
    document.getElementById('stat-critical').textContent = s.critical_signals ?? '—';
    document.getElementById('stat-posture').textContent = s.global_posture ?? '—';
    document.getElementById('stat-forecasts').textContent = s.avg_confidence ? s.avg_confidence + '%' : '—';
  })
  .catch(() => {});

const enterBtn = document.getElementById('enter-command-center');
enterBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  const auth = await gate.ensureAuthenticated({ redirect: false });
  if (auth) {
    window.location.href = appUrl('/command-center');
  } else {
    window.location.href = 'signin.html';
  }
});

(async () => {
  const auth = await gate.restoreIfAuthenticated({ redirectOnFailure: false });
  if (auth) {
    const enter = document.createElement('a');
    enter.href = appUrl('/command-center');
    enter.className = 'btn btn--toxic btn--sm landing-resume';
    enter.textContent = 'Resume Session';
    document.querySelector('.landing-actions')?.appendChild(enter);
  }
})();

window.addEventListener('beforeunload', () => scene.destroy());
