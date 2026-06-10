import { bus } from './EventBus.js';
import { api } from './ApiClient.js';
import { toast } from './ui.js';

/**
 * VoiceController — browser SpeechRecognition front-end for the
 * Voice Command Intelligence module. The recognised transcript is
 * sent to the backend (Speechmatics-backed when configured) which
 * maps it to a *read-only* analyst intent and returns a payload.
 */
export class VoiceController {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.hasApi = Boolean(SR);
    this.secure = window.isSecureContext !== false; // true on https + localhost
    this.supported = this.hasApi && this.secure;
    this.listening = false;
    if (this.hasApi) {
      this.rec = new SR();
      this.rec.lang = 'en-US';
      this.rec.interimResults = false;
      this.rec.maxAlternatives = 1;
      this.rec.onresult = (e) => this._onResult(e);
      this.rec.onend = () => this._setListening(false);
      this.rec.onerror = (e) => { toast(this._errorText(e.error)); this._setListening(false); };
    }
  }

  /** Why voice isn't available, for a clear user-facing message. */
  unsupportedReason() {
    if (!this.hasApi) return 'Voice capture needs Chrome or Edge — use the text command box below.';
    if (!this.secure) return 'Voice needs HTTPS or localhost — open the app via http://localhost or use the text box.';
    return 'Voice unavailable — use the text command box below.';
  }

  _errorText(code) {
    if (code === 'not-allowed' || code === 'service-not-allowed') return 'Microphone permission denied — allow mic access or use the text box.';
    if (code === 'no-speech') return 'No speech detected — try again or type a command.';
    if (code === 'network') return 'Voice service network error — type a command instead.';
    return 'Voice error: ' + code;
  }

  toggle() {
    if (!this.supported) {
      toast(this.unsupportedReason());
      bus.emit('voice:unsupported', this.unsupportedReason());
      return;
    }
    this.listening ? this.stop() : this.start();
  }

  start() {
    try {
      this.rec.start();
      this._setListening(true);
      toast('Listening…');
    } catch {
      // Some engines throw if start() is called twice or without a gesture.
      toast(this.unsupportedReason());
      bus.emit('voice:unsupported', this.unsupportedReason());
    }
  }
  stop() { try { this.rec.stop(); } catch { /* noop */ } }

  _setListening(v) { this.listening = v; bus.emit('voice:listening', v); }

  _onResult(e) {
    const transcript = e.results[0][0].transcript;
    bus.emit('voice:transcript', transcript);
    this.execute(transcript);
  }

  /** Send a transcript (from speech or typed) to the backend. */
  async execute(transcript) {
    try {
      const result = await api.voiceCommand(transcript);
      bus.emit('voice:result', result);
      toast(`▸ ${result.response}`);
    } catch (err) {
      toast('Command failed: ' + err.message);
    }
  }
}

export const voice = new VoiceController();
