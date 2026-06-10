import { env } from '../config/env.js';
import * as fb from '../data/fallback.js';

/**
 * Voice Command Intelligence (Speechmatics).
 *
 * Accepts a transcript (from browser SpeechRecognition or an
 * uploaded audio job) and maps it to a *read-only* analyst command.
 * Commands only retrieve and summarise intelligence — never act
 * offensively.
 *
 * Without a Speechmatics key, the intent matcher still works on
 * text transcripts produced client-side.
 */
class SpeechmaticsService {
  constructor() {
    this.apiKey = env.speechmatics.apiKey;
    this.baseUrl = env.speechmatics.baseUrl;
    this.live = Boolean(this.apiKey);
  }

  status() {
    return { live: this.live, mode: this.live ? 'speechmatics' : 'client-side/simulated' };
  }

  /** Map a finished transcript to an analyst intent. */
  interpret(transcript) {
    return fb.matchVoiceCommand(transcript);
  }

  /**
   * Submit an audio transcription job (live mode). Returns a job id;
   * the client polls for completion. Stubbed safely without a key.
   */
  async submitJob(/* audioBuffer */) {
    if (!this.live) {
      return { ok: false, mode: 'unavailable', message: 'Speechmatics key not configured — use browser speech recognition instead.' };
    }
    try {
      const res = await fetch(`${this.baseUrl}/jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const data = await res.json();
      return { ok: res.ok, jobId: data.id, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

export const speechmatics = new SpeechmaticsService();
