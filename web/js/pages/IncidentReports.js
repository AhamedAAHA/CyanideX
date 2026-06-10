import { Component, fmt } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { sevChip, skeleton, toast } from '../core/ui.js';

/**
 * Incident Reports — PDF-style report UI with a cinematic timeline
 * builder and the cascading attack-chain simulation.
 */
export class IncidentReports extends Component {
  render() {
    return `
      <div class="grid grid-3 cx-enter">
        <div class="glass" style="display:flex;flex-direction:column">
          <div class="card-head"><h3>Open Incidents</h3><span class="tag">CASE FILE</span></div>
          <div class="card-body" id="inc-list" style="overflow-y:auto;max-height:70vh">${skeleton(300)}</div>
        </div>
        <div class="glass col-span-2" id="inc-detail">
          <div class="card-head"><h3>Incident Dossier</h3><span class="tag" id="inc-id">—</span></div>
          <div class="card-body"><p class="dim">Select an incident to open its dossier.</p></div>
        </div>
      </div>
      <div class="glass" style="margin-top:18px">
        <div class="card-head"><h3>Cascading Attack Simulation</h3><span class="tag">CHAIN MODEL</span></div>
        <div class="card-body"><div class="chain" id="inc-cascade">${skeleton(140)}</div></div>
      </div>`;
  }

  afterRender() { this.load(); }

  async load() {
    const { reports } = await api.incidents();
    this.reports = reports;
    this.$('#inc-list').innerHTML = reports.map((r) => `
      <div class="feed-item" data-id="${r.signal_id}" style="cursor:pointer;flex-direction:column;align-items:flex-start;gap:6px">
        <div style="display:flex;justify-content:space-between;width:100%">
          <span class="hl" style="font-size:.82rem">${r.title}</span>
          ${r.severity_band ? `<span class="sev sev--${r.severity_band.toLowerCase()}">${r.severity_band}</span>` : ''}
        </div>
        <span class="mono" style="font-size:.62rem;color:var(--text-faint)">${r.status} · ${r.analyst}</span>
      </div>`).join('');
    this.$$('#inc-list .feed-item').forEach((it) =>
      this.listen(it, 'click', () => this.openReport(it.dataset.id)));

    if (reports[0]) this.openReport(reports[0].signal_id);
  }

  async openReport(signalId) {
    const r = await api.incident(signalId);
    this.$('#inc-id').textContent = r.id;
    this.$('#inc-detail').querySelector('.card-body').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <h2 style="font-family:var(--font-display);font-size:1.2rem">${r.title}</h2>
          <div class="mono" style="font-size:.68rem;color:var(--text-dim);margin-top:4px">CASE ${r.id} · ${r.status} · analyst ${r.analyst}</div>
        </div>
        <div style="display:flex;gap:8px">
          <span class="sev sev--${(r.severity_band||'low').toLowerCase()}">${r.severity_band}</span>
          <button class="btn btn--sm" id="inc-export">⤓ Export</button>
        </div>
      </div>
      <div style="margin-top:18px;position:relative;padding-left:22px">
        ${r.timeline.map((t,i)=>`
          <div style="position:relative;padding-bottom:18px">
            <span style="position:absolute;left:-22px;top:2px;width:11px;height:11px;border-radius:50%;background:var(--cyan);box-shadow:var(--glow-cyan)"></span>
            ${i < r.timeline.length-1 ? '<span style="position:absolute;left:-17px;top:14px;bottom:-4px;width:1px;background:var(--glass-border)"></span>' : ''}
            <div class="mono" style="font-size:.62rem;color:var(--cyan)">${fmt.time(t.t)} · ${t.label}</div>
            <div style="font-size:.82rem;color:var(--text-dim);margin-top:3px">${t.detail}</div>
          </div>`).join('')}
      </div>`;
    const btn = this.$('#inc-export');
    if (btn) this.listen(btn, 'click', () => toast('Report queued for PDF export (demo)'));
    this.loadCascade(signalId);
  }

  async loadCascade(signalId) {
    const sim = await api.cascade(signalId);
    const colorByImpact = (i) => i >= 80 ? 'var(--sev-crit)' : i >= 55 ? 'var(--sev-high)' : i >= 30 ? 'var(--sev-med)' : 'var(--sev-low)';
    this.$('#inc-cascade').innerHTML = sim.stages.map((s, i) => `
      ${i ? '<div class="chain-arrow">▸</div>' : ''}
      <div class="chain-node" style="animation-delay:${i*0.12}s">
        <div class="stage">${s.stage}</div>
        <div class="vector">${s.vector}</div>
        <div class="impact">
          <div class="mono" style="font-size:.6rem;color:var(--text-faint)">IMPACT ${s.impact}% · P ${s.probability}%</div>
          <div class="meter" style="margin-top:5px"><span style="width:${s.impact}%;background:${colorByImpact(s.impact)}"></span></div>
        </div>
      </div>`).join('');
  }
}
