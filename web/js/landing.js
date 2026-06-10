import { ThreatGlobe } from './components/ThreatGlobe.js';

/**
 * Landing page controller — mounts the hero threat globe and pulls a
 * live snapshot for the headline stats. If a session already exists,
 * offers a fast path straight into the OS.
 */
const stage = document.getElementById('hero-globe');
const globe = new ThreatGlobe(stage, { radius: 2.0 });

async function hydrate() {
  try {
    const [globeData, overview] = await Promise.all([
      fetch('/api/globe').then((r) => r.json()),
      fetch('/api/overview').then((r) => r.json()),
    ]);
    globe.setData({ nodes: globeData.nodes, paths: globeData.paths });
    const s = overview.stats || {};
    setText('s-signals', s.total_signals ?? 48);
    setText('s-regions', (globeData.heatmap || []).length || 6);
    setText('s-posture', s.global_posture || 'GUARDED');
  } catch {
    // Backend offline: the globe still spins as a decorative animation.
  }
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

hydrate();
