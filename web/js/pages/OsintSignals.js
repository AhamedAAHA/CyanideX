import { Component, fmt } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { bus } from '../core/EventBus.js';
import { sevChip, toast, skeleton } from '../core/ui.js';

/** OSINT Signals — Bright Data intelligence feed with filters. */
export class OsintSignals extends Component {
  constructor(p) { super(p); this.filter = { category: '', region: '' }; }

  render() {
    return `
      <div class="glass cx-enter">
        <div class="card-head">
          <h3>OSINT Intelligence Signals</h3>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="tag" id="osint-src">BRIGHT DATA</span>
            <button class="btn btn--sm btn--toxic" id="osint-refresh">↻ Recollect</button>
          </div>
        </div>
        <div class="card-body">
          <div id="osint-filters" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"></div>
          <div id="osint-table">${skeleton(280)}</div>
        </div>
      </div>`;
  }

  afterRender() {
    this.listen(this.$('#osint-refresh'), 'click', async () => {
      this.$('#osint-refresh').disabled = true;
      await api.refreshSignals();
      toast('OSINT collection refreshed');
      await this.load();
      this.$('#osint-refresh').disabled = false;
    });
    this.load();
  }

  async load() {
    const params = new URLSearchParams();
    if (this.filter.category) params.set('category', this.filter.category);
    if (this.filter.region) params.set('region', this.filter.region);
    const data = await api.signals(params.toString());
    this.signals = data.signals;
    this.$('#osint-src').textContent = data.source.toUpperCase();
    this.renderFilters();
    this.renderTable();
  }

  renderFilters() {
    const cats = [...new Set(this.signals.map((s) => s.category))];
    const chips = ['', ...cats].map((c) => `
      <span class="chip ${this.filter.category === c ? 'is-active' : ''}" data-cat="${c}">${c || 'ALL'}</span>`).join('');
    this.$('#osint-filters').innerHTML = chips;
    this.$$('#osint-filters .chip').forEach((ch) =>
      this.listen(ch, 'click', () => { this.filter.category = ch.dataset.cat; this.load(); }));
  }

  renderTable() {
    const rows = this.signals.map((s) => `
      <tr data-id="${s.id}">
        <td class="mono" style="color:var(--cyan)">${s.id}</td>
        <td><span class="hl">${s.headline}</span><br><span class="mono" style="font-size:.62rem;color:var(--text-faint)">${s.source}</span></td>
        <td>${s.category}</td>
        <td>${s.region} · ${s.sector}</td>
        <td>${sevChip(s.severity)}</td>
        <td class="mono">${s.confidence}%</td>
        <td class="mono" style="font-size:.66rem">${fmt.ago(s.first_seen)}</td>
      </tr>`).join('');
    this.$('#osint-table').innerHTML = `
      <table class="tbl">
        <thead><tr><th>ID</th><th>Signal</th><th>Category</th><th>Region · Sector</th><th>Severity</th><th>Conf.</th><th>Seen</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    this.$$('#osint-table tbody tr').forEach((tr) =>
      this.listen(tr, 'click', () => {
        const sig = this.signals.find((s) => s.id === tr.dataset.id);
        bus.emit('signal:select', sig);
        toast('Selected ' + sig.id + ' — open Incident Reports / Risk DNA to inspect');
      }));
  }
}
