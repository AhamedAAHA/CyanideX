import { env } from '../config/env.js';
import * as fb from '../data/fallback.js';

/**
 * AI Threat Forecasting Engine (AIML API).
 *
 * Turns raw OSINT signals into structured threat forecasts:
 * category, severity, attack probability, target sector,
 * confidence, mitigation and an executive summary.
 *
 * Falls back to a deterministic simulated forecaster when no key
 * is configured, so the forecasting UI always has data.
 */
class AimlService {
  constructor() {
    this.apiKey = env.aiml.apiKey;
    this.baseUrl = env.aiml.baseUrl;
    // The analysis model drives threat forecasting; other tuned models
    // (chat/search/vision/transcribe/tts) are available via env.aiml.
    this.model = env.aiml.models.analysis;
    this.live = Boolean(this.apiKey);
  }

  status() {
    return { live: this.live, mode: this.live ? 'aiml-api' : 'simulated', model: this.live ? this.model : 'cyanidex-sim-forecaster' };
  }

  async analyzeSignal(signal) {
    if (!this.live) return fb.analyzeSignal(signal);
    try {
      const prompt = this.#buildPrompt(signal);
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a defensive cyber threat-intelligence analyst. Respond with strict JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
      });
      if (!res.ok) throw new Error(`AIML API responded ${res.status}`);
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return { ...fb.analyzeSignal(signal), ...parsed, model: this.model };
    } catch (err) {
      return { ...fb.analyzeSignal(signal), _fallback: err.message };
    }
  }

  async analyzeBatch(signals) {
    return Promise.all(signals.map((s) => this.analyzeSignal(s)));
  }

  async generateBriefing(signals, analyses, heatmap) {
    // Briefing synthesis always uses the structured aggregator;
    // a live model would enrich the narrative fields.
    return fb.executiveBriefing(signals, analyses, heatmap);
  }

  #buildPrompt(signal) {
    return [
      'Analyze this defensive threat-intel signal and return JSON with keys:',
      'threat_category, severity_score (0-10), attack_probability (0-100),',
      'target_sector, confidence (0-100), recommended_mitigation, executive_summary.',
      '',
      `Signal: ${JSON.stringify(signal)}`,
    ].join('\n');
  }
}

export const aiml = new AimlService();
