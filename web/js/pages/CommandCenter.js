import { Component, fmt } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { bus } from '../core/EventBus.js';
import { sevChip, meterHTML, skeleton } from '../core/ui.js';
import { ThreatGlobe } from '../components/ThreatGlobe.js';

/**
 * CommandCenter — the OS home. War-room overview combining live
 * stats, a mini threat globe, real-time source feed, radar scanner,
 * the holographic AI assistant and the "Tomorrow's Threats" panel.
 */
export class CommandCenter extends Component {
  render() {
    return `
      <div class="grid grid-4 cx-enter" id="stat-row">
        ${[0, 1, 2, 3].map(() => `<div class="glass">${skeleton(96)}</div>`).join('')}
      </div>

      <div class="grid grid-3" style="margin-top:18px">
        <div class="glass glass--cyan holo col-span-2" style="min-height:420px">
          <div class="card-head"><h3>Global Threat Globe</h3><span class="tag">LIVE · SIMULATED</span></div>
          <div id="cc-globe" style="height:380px"></div>
        </div>

        <div class="glass">
          <div class="card-head"><h3>Cyber Radar</h3><span class="tag">SCANNING</span></div>
          <div class="card-body">
            <div class="radar">
              <div class="ring"></div><div class="ring r2"></div><div class="ring r3"></div><div class="ring r4"></div>
              <div class="sweep"></div>
              <span class="blip" style="top:30%;left:62%"></span>
              <span class="blip" style="top:58%;left:38%;animation-delay:.8s"></span>
              <span class="blip" style="top:44%;left:70%;animation-delay:1.6s"></span>
            </div>
            <div id="cc-warroom" class="mono" style="font-size:.72rem;color:var(--text-dim);margin-top:14px;line-height:1.6"></div>
          </div>
        </div>
      </div>

      <div class="grid grid-3" style="margin-top:18px">
        <div class="glass col-span-2">
          <div class="card-head"><h3>Real-Time Source Feed</h3><span class="tag" id="feed-src">OSINT</span></div>
          <div class="card-body"><div class="feed" id="cc-feed"></div></div>
        </div>

        <div class="glass holo">
          <div class="card-head"><h3>Holographic Assistant</h3><span class="tag">AI</span></div>
          <div class="card-body">
            <div class="holo-assistant">
              <div class="holo-core"></div>
              <div>
                <div class="mono" style="font-size:.66rem;color:var(--cyan);letter-spacing:1px">CYANIDEX // ANALYST AI</div>
                <p id="cc-assistant" style="font-size:.82rem;color:var(--text-dim);margin:8px 0 0;line-height:1.6">Synchronising with threat fabric…</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:18px">
        <div class="glass">
          <div class="card-head"><h3>Tomorrow's Threats</h3><span class="tag">FORECAST</span></div>
          <div class="card-body" id="cc-tomorrow">${skeleton(120)}</div>
        </div>
        <div class="glass">
          <div class="card-head"><h3>Regional Risk Index</h3><span class="tag">HEATMAP</span></div>
          <div class="card-body" id="cc-heatmap">${skeleton(120)}</div>
        </div>
      </div>
    `;
  }

  afterRender() {
    this.globe = new ThreatGlobe(this.$('#cc-globe'));
    this.onDestroy(() => this.globe.destroy());
    this.load();
    this.startFeed();
  }

  async load() {
    try {
      const [overview, globe, tomorrow] = await Promise.all([api.overview(), api.globe(), api.tomorrow()]);
      this.globe.setData({ nodes: globe.nodes, paths: globe.paths });
      this.renderStats(overview.stats);
      this.$('#cc-warroom').textContent = overview.war_room_summary;
      this.$('#cc-assistant').textContent = overview.briefing_headline;
      this.renderHeatmap(overview.heatmap);
      this.renderTomorrow(tomorrow);
      bus.emit('posture', overview.stats.global_posture);
    } catch (err) {
      this.$('#cc-assistant').textContent = 'Intel link degraded: ' + err.message;
    }
  }

  renderStats(s) {
    const tiles = [
      { label: 'Active Signals', value: s.total_signals, sub: `${s.collection || 'OSINT'} stream`, toxic: false },
      { label: 'Critical', value: s.critical_signals, sub: 'severity ≥ 8.0', toxic: false },
      { label: 'Avg Severity', value: s.avg_severity, sub: `confidence ${s.avg_confidence}%`, toxic: true },
      { label: 'Global Posture', value: s.global_posture, sub: `peak: ${s.highest_risk_region}`, toxic: true, small: true },
    ];
    this.$('#stat-row').innerHTML = tiles.map((t) => `
      <div class="glass stat">
        <div class="label">${t.label}</div>
        <div class="value ${t.toxic ? 'toxic' : ''}" style="${t.small ? 'font-size:1.25rem' : ''}">${t.value}</div>
        <div class="sub">${t.sub}</div>
      </div>`).join('');
  }

  renderHeatmap(heatmap) {
    this.$('#cc-heatmap').innerHTML = heatmap.map((h) => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:5px">
          <span class="hl">${h.name}</span>
          <span class="mono" style="color:var(--cyan)">${h.risk_score} · ${h.trend}</span>
        </div>
        ${meterHTML(h.risk_score * 10)}
      </div>`).join('');
  }

  renderTomorrow(t) {
    this.$('#cc-tomorrow').innerHTML = `
      <div class="chip is-active" style="margin-bottom:12px">PREDICTED POSTURE · ${t.posture}</div>
      ${t.predictions.map((p) => `<p style="font-size:.84rem;color:var(--text-dim);margin:0 0 10px;padding-left:14px;border-left:2px solid var(--toxic)">${p}</p>`).join('')}`;
  }

  startFeed() {
    const feedEl = this.$('#cc-feed');
    const push = async () => {
      try {
        const { item } = await api.feedTick();
        if (!item) return;
        const band = fmt.sevBand(item.severity);
        const colors = { low: 'var(--sev-low)', med: 'var(--sev-med)', high: 'var(--sev-high)', crit: 'var(--sev-crit)' };
        const node = document.createElement('div');
        node.className = 'feed-item';
        node.innerHTML = `
          <span class="dot" style="color:${colors[band]}"></span>
          <div style="flex:1">
            <div style="font-size:.82rem;color:var(--text)">${item.headline}</div>
            <div style="display:flex;gap:10px;margin-top:4px">
              <span class="src">${item.source}</span>
              <span class="mono" style="font-size:.62rem;color:var(--text-faint)">${item.region} · ${item.sector}</span>
              ${sevChip(item.severity)}
            </div>
          </div>`;
        feedEl.prepend(node);
        while (feedEl.children.length > 12) feedEl.lastChild.remove();
      } catch { /* feed paused */ }
    };
    push();
    this.interval(push, 3500);
  }
}
