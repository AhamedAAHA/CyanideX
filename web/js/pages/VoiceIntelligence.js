import { Component } from '../core/Component.js';
import { api } from '../core/ApiClient.js';
import { bus } from '../core/EventBus.js';
import { voice } from '../core/VoiceController.js';

/** Voice Command Intelligence — speech-driven, read-only analyst console. */
export class VoiceIntelligence extends Component {
  render() {
    return `
      <div class="grid grid-2 cx-enter">
        <div class="glass holo">
          <div class="card-head"><h3>Voice Command Console</h3><span class="tag" id="vi-mode">SPEECHMATICS</span></div>
          <div class="card-body center">
            <button class="mic-btn" id="vi-mic" style="width:96px;height:96px;margin:18px auto;font-size:2rem">◉</button>
            <div class="mono" id="vi-status" style="font-size:.74rem;color:var(--text-dim)">Press to speak — or type a command below.</div>
            <div style="display:flex;gap:8px;margin-top:18px">
              <input class="input" id="vi-input" placeholder="Show today's highest risk threat" />
              <button class="btn btn--primary" id="vi-send">Run</button>
            </div>
            <div id="vi-examples" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:16px"></div>
          </div>
        </div>
        <div class="glass">
          <div class="card-head"><h3>Command Result</h3><span class="tag" id="vi-intent">IDLE</span></div>
          <div class="card-body"><pre id="vi-result" class="mono" style="font-size:.74rem;color:var(--text-dim);white-space:pre-wrap;word-break:break-word;margin:0;max-height:480px;overflow:auto">Awaiting command…</pre></div>
        </div>
      </div>`;
  }

  afterRender() {
    this.$('#vi-mode').textContent = voice.supported ? 'SPEECHMATICS / BROWSER' : 'TEXT MODE';
    this.listen(this.$('#vi-mic'), 'click', () => voice.toggle());
    this.listen(this.$('#vi-send'), 'click', () => this.runTyped());
    this.listen(this.$('#vi-input'), 'keydown', (e) => { if (e.key === 'Enter') this.runTyped(); });

    // Reflect voice availability up-front.
    if (!voice.supported) {
      this.$('#vi-mic').style.opacity = '0.45';
      this.$('#vi-status').textContent = voice.unsupportedReason();
      this.$('#vi-input').focus();
    }

    this.onDestroy(bus.on('voice:listening', (v) => {
      this.$('#vi-mic').classList.toggle('is-live', v);
      this.$('#vi-status').textContent = v ? '● Listening…' : 'Press to speak — or type a command below.';
    }));
    this.onDestroy(bus.on('voice:unsupported', (reason) => {
      this.$('#vi-status').textContent = reason || voice.unsupportedReason();
      this.$('#vi-input').focus();
    }));
    this.onDestroy(bus.on('voice:transcript', (t) => { this.$('#vi-input').value = t; }));
    this.onDestroy(bus.on('voice:result', (r) => this.showResult(r)));

    this.loadExamples();
  }

  async loadExamples() {
    const { examples } = await api.voiceExamples();
    this.$('#vi-examples').innerHTML = examples.map((e) => `<span class="chip" data-ex="${e}">${e}</span>`).join('');
    this.$$('#vi-examples .chip').forEach((ch) =>
      this.listen(ch, 'click', () => { this.$('#vi-input').value = ch.dataset.ex; this.runTyped(); }));
  }

  runTyped() {
    const t = this.$('#vi-input').value.trim();
    if (t) voice.execute(t);
  }

  showResult(r) {
    this.$('#vi-intent').textContent = (r.intent || 'unknown').toUpperCase() + ` · ${r.confidence}%`;
    this.$('#vi-result').textContent = JSON.stringify(r, null, 2);
  }
}
