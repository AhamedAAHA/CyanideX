import { Component } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { sevChip } from '../core/ui.js';
import { ThreatGlobe } from '../components/ThreatGlobe.js';

/** Full-screen 3D threat globe with live node + attack-path inspector. */
export class ThreatGlobePage extends Component {
  render() {
    return `
      <div class="grid grid-3 cx-enter" style="height:calc(100vh - 110px)">
        <div class="glass glass--cyan holo col-span-2" style="position:relative">
          <div class="card-head"><h3>3D Global Threat Globe</h3><span class="tag">DRAG TO ROTATE</span></div>
          <div id="globe-stage" style="height:calc(100% - 50px)"></div>
        </div>
        <div class="glass" style="display:flex;flex-direction:column">
          <div class="card-head"><h3>Live Attack Paths</h3><span class="tag" id="path-count">—</span></div>
          <div class="card-body" id="path-list" style="overflow-y:auto"></div>
        </div>
      </div>
      <div class="grid grid-4" style="margin-top:18px" id="region-tiles"></div>
    `;
  }

  afterRender() {
    try {
      this.globe = new ThreatGlobe(this.$('#globe-stage'), { radius: 2.1 });
      this.onDestroy(() => this.globe.destroy());
    } catch (err) {
      this.renderGlobeFallback(err);
      this.globe = null;
    }
    this.load();
  }

  renderGlobeFallback(err) {
    const el = this.$('#globe-stage');
    if (!el) return;
    el.innerHTML = `
      <div style="height:100%;display:grid;place-items:center;text-align:center;padding:24px">
        <div>
          <div class="mono" style="font-size:.62rem;letter-spacing:2px;color:var(--sev-high);text-transform:uppercase;margin-bottom:10px">WebGL Unavailable</div>
          <p class="dim" style="max-width:460px;margin:0 auto;line-height:1.6">${err?.message || 'The 3D globe could not start in this browser context.'}</p>
        </div>
      </div>`;
  }

  async load() {
    const data = await api.globe();
    this.globe?.setData({ nodes: data.nodes, paths: data.paths });
    this.$('#path-count').textContent = data.paths.length + ' ACTIVE';
    this.$('#path-list').innerHTML = data.paths.map((p) => `
      <div class="feed-item" style="flex-direction:column;align-items:flex-start;gap:6px">
        <div style="display:flex;justify-content:space-between;width:100%">
          <span class="mono" style="font-size:.74rem;color:var(--cyan)">${p.from.name} → ${p.to.name}</span>
          ${sevChip(p.severity)}
        </div>
        <span class="mono" style="font-size:.64rem;color:var(--text-faint)">${p.category}</span>
      </div>`).join('');

    this.$('#region-tiles').innerHTML = data.heatmap.map((h) => `
      <div class="glass stat">
        <div class="label">${h.name}</div>
        <div class="value">${h.risk_score}</div>
        <div class="sub">${h.signal_count} signals · ${h.trend}</div>
      </div>`).join('');
  }
}
