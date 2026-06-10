import { Component } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { sevChip, skeleton, toast } from '../core/ui.js';

/** Autonomous Executive Briefing — AI daily brief with voice playback. */
export class ExecutiveBriefings extends Component {
  render() {
    return `<div id="brief-root" class="cx-enter">${skeleton(400)}</div>`;
  }

  afterRender() { this.load(); }

  async load() {
    const b = await api.briefing();
    this.brief = b;
    this.$('#brief-root').innerHTML = `
      <div class="glass glass--cyan holo" style="margin-bottom:18px">
        <div class="card-head">
          <h3>${b.title}</h3>
          <button class="btn btn--sm btn--toxic" id="brief-speak">▶ Voice Briefing</button>
        </div>
        <div class="card-body">
          <p style="font-size:1rem;color:var(--text);line-height:1.6;margin:0">${b.headline}</p>
          <div style="margin-top:14px;padding:12px 14px;border-left:2px solid var(--toxic);background:rgba(182,255,58,.05);border-radius:6px">
            <div class="mono" style="font-size:.62rem;color:var(--toxic);margin-bottom:4px">WAR-ROOM SUMMARY</div>
            <div style="font-size:.84rem;color:var(--text-dim)">${b.war_room_summary}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="glass">
          <div class="card-head"><h3>Top Threats</h3><span class="tag">${b.top_threats.length}</span></div>
          <div class="card-body">${b.top_threats.map((t)=>`
            <div class="feed-item" style="justify-content:space-between;align-items:center">
              <div><div class="hl" style="font-size:.8rem">${t.headline}</div><span class="mono" style="font-size:.62rem;color:var(--text-faint)">${t.category} · ${t.region}</span></div>
              ${sevChip(t.severity)}
            </div>`).join('')}</div>
        </div>
        <div class="glass">
          <div class="card-head"><h3>Most Targeted Industries</h3><span class="tag">SECTOR</span></div>
          <div class="card-body">${b.most_targeted_industries.map((s)=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)">
              <span class="hl" style="font-size:.84rem">${s.sector}</span>
              <span class="mono" style="color:var(--cyan)">${s.signals} signals</span>
            </div>`).join('')}</div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:18px">
        <div class="glass">
          <div class="card-head"><h3>Predicted Attacks</h3><span class="tag">FORECAST</span></div>
          <div class="card-body">${b.predicted_attacks.map((p)=>`<p style="font-size:.84rem;color:var(--text-dim);margin:0 0 10px;padding-left:14px;border-left:2px solid var(--toxic)">${p}</p>`).join('')}</div>
        </div>
        <div class="glass">
          <div class="card-head"><h3>Recommended Actions</h3><span class="tag">PLAYBOOK</span></div>
          <div class="card-body">${b.recommended_actions.map((a,i)=>`<div style="display:flex;gap:10px;margin-bottom:10px"><span class="mono" style="color:var(--cyan)">0${i+1}</span><span style="font-size:.84rem;color:var(--text-dim)">${a}</span></div>`).join('')}</div>
        </div>
      </div>`;

    this.listen(this.$('#brief-speak'), 'click', () => this.speak());
  }

  speak() {
    if (!('speechSynthesis' in window)) { toast('Speech synthesis unavailable'); return; }
    const text = `${this.brief.headline}. ${this.brief.war_room_summary}. Recommended actions: ${this.brief.recommended_actions.join('. ')}`;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02; u.pitch = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    toast('▶ Voice briefing playing');
  }
}
