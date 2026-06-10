import { LandingScene } from './components/LandingScene.js';

const scene = new LandingScene(document.getElementById('landing-3d'));

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

// If already signed in, offer quick entry
try {
  if (localStorage.getItem('cyanidex.session')) {
    const enter = document.createElement('a');
    enter.href = 'app.html';
    enter.className = 'btn btn--toxic btn--sm landing-resume';
    enter.textContent = 'Resume Session';
    document.querySelector('.landing-actions')?.appendChild(enter);
  }
} catch { /* noop */ }

window.addEventListener('beforeunload', () => scene.destroy());
