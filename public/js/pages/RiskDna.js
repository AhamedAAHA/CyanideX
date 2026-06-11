import { Component } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { skeleton } from '../core/ui.js';

/** Cyber Risk DNA — a genomic-style profile of each threat. */
export class RiskDna extends Component {
  render() {
    return `
      <div class="glass cx-enter" style="margin-bottom:18px">
        <div class="card-head"><h3>Cyber Risk DNA System</h3><span class="tag">GENOMIC PROFILING</span></div>
        <div class="card-body"><p class="dim" style="font-size:.84rem;margin:0">Each threat is decomposed into a behavioural "DNA" — origin, motivation, method, industry, timeline and impact — to fingerprint adversary patterns.</p></div>
      </div>
      <div class="grid grid-3" id="dna-grid">${[0,1,2].map(()=>`<div class="glass">${skeleton(260)}</div>`).join('')}</div>`;
  }

  afterRender() { this.load(); }

  async load() {
    const { profiles } = await api.riskDna();
    this.$('#dna-grid').innerHTML = profiles.map((d) => this.card(d)).join('');
  }

  strand(d) {
    return `<div style="display:flex;gap:4px;align-items:flex-end;height:54px;margin:10px 0">
      ${d.dna_strands.map((s) => `<div title="${s.marker}" style="flex:1;height:${Math.round(s.weight*100)}%;border-radius:3px;background:linear-gradient(180deg,var(--cyan),var(--toxic));opacity:${0.4+s.weight*0.6}"></div>`).join('')}
    </div>`;
  }

  card(d) {
    const rows = [
      ['Origin', d.origin], ['Motivation', d.motivation], ['Method', d.attack_method],
      ['Industry', d.affected_industry], ['Timeline', d.timeline], ['Confidence', d.confidence_score + '%'],
    ];
    return `
      <div class="glass holo">
        <div class="card-head"><h3>${d.affected_industry} Strain</h3><span class="tag mono">${d.id}</span></div>
        <div class="card-body">
          ${this.strand(d)}
          <table class="tbl" style="font-size:.76rem">
            ${rows.map(([k,v])=>`<tr style="cursor:default"><td class="mono" style="color:var(--text-faint);width:42%">${k}</td><td class="hl">${v}</td></tr>`).join('')}
          </table>
          <div style="margin-top:10px;font-size:.78rem;color:var(--text-dim)"><b style="color:var(--toxic)">Impact:</b> ${d.possible_impact}</div>
          <div style="margin-top:8px;font-size:.76rem;color:var(--text-dim)"><b style="color:var(--cyan)">Mitigation:</b> ${d.mitigation_strategy}</div>
        </div>
      </div>`;
  }
}
