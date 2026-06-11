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
    this.supported = Boolean(SR);
    this.listening = false;
    this.unsupportedNotified = false;
    if (this.supported) {
      this.rec = new SR();
      this.rec.lang = 'en-US';
      this.rec.interimResults = false;
      this.rec.maxAlternatives = 1;
      this.rec.onresult = (e) => this._onResult(e);
      this.rec.onend = () => this._setListening(false);
      this.rec.onerror = (e) => { toast('Voice error: ' + e.error); this._setListening(false); };
    }
  }

  toggle() {
    if (!this.supported) {
      if (!this.unsupportedNotified) {
        toast('SpeechRecognition unavailable - type a command instead.');
        this.unsupportedNotified = true;
      }
      bus.emit('voice:unsupported');
      return;
    }
    this.listening ? this.stop() : this.start();
  }

  start() { try { this.rec.start(); this._setListening(true); toast('Listening…'); } catch { /* already started */ } }
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
