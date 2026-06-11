import { Component } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { sevChip, meterHTML, skeleton } from '../core/ui.js';

/** AI Threat Forecasting — per-signal forecasts from the AIML engine. */
export class AiForecasting extends Component {
  render() {
    return `
      <div class="glass cx-enter" style="margin-bottom:18px">
        <div class="card-head"><h3>AI Threat Forecasting Engine</h3><span class="tag" id="ai-model">AIML</span></div>
        <div class="card-body">
          <p class="dim" style="font-size:.84rem;margin:0">Structured forecasts: category, severity, attack probability, target sector, confidence, mitigation and an executive summary — generated per OSINT signal.</p>
        </div>
      </div>
      <div class="grid grid-2" id="forecast-grid">${[0,1,2,3].map(()=>`<div class="glass">${skeleton(220)}</div>`).join('')}</div>`;
  }

  afterRender() { this.load(); }

  async load() {
    const data = await api.forecasts();
    this.$('#ai-model').textContent = (data.model || 'AIML').toUpperCase();
    this.$('#forecast-grid').innerHTML = data.forecasts.map((f) => this.card(f)).join('');
  }

  card(f) {
    return `
      <div class="glass holo">
        <div class="card-head">
          <h3>${f.threat_category}</h3>
          ${sevChip(f.severity_score)}
        </div>
        <div class="card-body">
          <div style="display:flex;gap:18px;margin-bottom:12px">
            <div style="flex:1">
              <div class="mono" style="font-size:.62rem;color:var(--text-dim)">ATTACK PROBABILITY</div>
              <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--toxic)">${f.attack_probability}%</div>
            </div>
            <div style="flex:1">
              <div class="mono" style="font-size:.62rem;color:var(--text-dim)">TARGET SECTOR</div>
              <div style="font-family:var(--font-head);font-size:1.1rem;margin-top:8px">${f.target_sector}</div>
            </div>
          </div>
          <div class="mono" style="font-size:.62rem;color:var(--text-dim);margin-bottom:5px">CONFIDENCE ${f.confidence}%</div>
          ${meterHTML(f.confidence)}
          <p style="font-size:.8rem;color:var(--text-dim);margin:12px 0 0;line-height:1.6">${f.executive_summary}</p>
          <div style="margin-top:12px;padding:10px 12px;border-left:2px solid var(--cyan);background:rgba(0,229,255,.05);border-radius:6px">
            <div class="mono" style="font-size:.6rem;color:var(--cyan);margin-bottom:4px">RECOMMENDED MITIGATION</div>
            <div style="font-size:.78rem;color:var(--text-dim)">${f.recommended_mitigation}</div>
          </div>
        </div>
      </div>`;
  }
}
