/**
 * ApiClient — thin wrapper around fetch for the CyanideX API.
 * Centralises error handling and base-url resolution.
 */
export class ApiClient {
  constructor(base = '/api') {
    this.base = base;
  }

  async #request(path, options = {}) {
    const res = await fetch(this.base + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${res.status} ${path} ${text}`);
    }
    return res.json();
  }

  get(path) { return this.#request(path); }
  post(path, body) { return this.#request(path, { method: 'POST', body: JSON.stringify(body || {}) }); }

  /* Domain helpers */
  status() { return this.get('/status'); }
  overview() { return this.get('/overview'); }
  globe() { return this.get('/globe'); }
  signals(params = '') { return this.get('/osint/signals' + (params ? `?${params}` : '')); }
  refreshSignals() { return this.post('/osint/refresh'); }
  feedTick() { return this.get('/osint/feed'); }
  forecasts() { return this.get('/ai/forecasts'); }
  tomorrow() { return this.get('/ai/tomorrow'); }
  riskDna() { return this.get('/riskdna'); }
  cascade(signalId) { return this.get('/simulation/cascade' + (signalId ? `?signalId=${signalId}` : '')); }
  incidents() { return this.get('/incidents'); }
  incident(signalId) { return this.get('/incidents/' + signalId); }
  briefing() { return this.get('/briefings/today'); }
  voiceExamples() { return this.get('/voice/examples'); }
  voiceCommand(transcript) { return this.post('/voice/command', { transcript }); }
}

export const api = new ApiClient();
