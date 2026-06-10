import { Component } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { store } from '../core/Store.js';
import { skeleton } from '../core/ui.js';

/** Settings — integration status, session info and role model. */
export class Settings extends Component {
  render() {
    const s = store.session || {};
    return `
      <div class="grid grid-2 cx-enter">
        <div class="glass">
          <div class="card-head"><h3>Integration Status</h3><span class="tag">SYSTEM</span></div>
          <div class="card-body" id="set-status">${skeleton(200)}</div>
        </div>
        <div class="glass">
          <div class="card-head"><h3>Operator Session</h3><span class="tag">${s.role || 'GUEST'}</span></div>
          <div class="card-body">
            <table class="tbl">
              <tr style="cursor:default"><td class="mono faint">Operator</td><td class="hl">${s.name || '—'}</td></tr>
              <tr style="cursor:default"><td class="mono faint">Email</td><td class="hl">${s.email || '—'}</td></tr>
              <tr style="cursor:default"><td class="mono faint">Role</td><td class="hl">${s.role || '—'}</td></tr>
              <tr style="cursor:default"><td class="mono faint">Issued</td><td class="hl mono" style="font-size:.7rem">${s.issued_at || '—'}</td></tr>
            </table>
            <div style="margin-top:14px">
              <div class="mono" style="font-size:.62rem;color:var(--text-dim);margin-bottom:8px">ROLE MODEL (SUPABASE RLS)</div>
              ${[['Admin','Full access · user management · logs'],['Analyst','Read intel · create incidents & voice commands'],['Viewer','Read-only intelligence access']].map(([r,d])=>`
                <div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)">
                  <span class="chip ${s.role===r?'is-active':''}">${r}</span>
                  <span style="font-size:.76rem;color:var(--text-dim)">${d}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="glass" style="margin-top:18px">
        <div class="card-head"><h3>About CyanideX</h3><span class="tag">v1.0</span></div>
        <div class="card-body">
          <p class="dim" style="font-size:.84rem;line-height:1.7;margin:0">
            CyanideX is a Multi-Modal Cyber Threat Forecasting &amp; Intelligence OS. It unifies OSINT collection
            (Bright Data), AI forecasting (AIML), voice intelligence (Speechmatics), 3D visualisation (Three.js)
            and a Supabase backend. This build runs entirely on simulated defensive intelligence until live API
            keys are supplied in <span class="mono">.env</span>. The platform is strictly analytical and defensive.
          </p>
        </div>
      </div>`;
  }

  afterRender() { this.load(); }

  async load() {
    const st = await api.status();
    const rows = [
      ['Supabase', st.integrations.supabase], ['Bright Data OSINT', st.integrations.brightData],
      ['AIML Forecasting', st.integrations.aiml], ['Speechmatics Voice', st.integrations.speechmatics],
    ];
    this.$('#set-status').innerHTML = rows.map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <span class="hl" style="font-size:.86rem">${k}</span>
        <span class="chip ${v?'is-active':''}">${v?'CONNECTED':'SIMULATED'}</span>
      </div>`).join('') + `
      <p class="mono faint" style="font-size:.68rem;margin-top:14px;line-height:1.6">Fallback intelligence ${st.integrations.fallback?'ENABLED':'disabled'} · model ${st.services.aiml.model}</p>`;
  }
}
