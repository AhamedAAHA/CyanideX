import { env } from '../config/env.js';
import * as fb from '../data/fallback.js';

/**
 * Bright Data OSINT Intelligence Engine.
 *
 * Collects *public* web intelligence (breach chatter, CVE feeds,
 * exposed-secret scans, phishing-domain registrations, ransomware
 * leak-site mentions). This is strictly defensive collection &
 * analysis — no exploitation or attack automation.
 *
 * Without a Bright Data token it returns a rich simulated feed so
 * the OSINT pipeline is fully demonstrable.
 */
class BrightDataService {
  constructor() {
    this.token = env.brightData.token;
    this.baseUrl = env.brightData.baseUrl;
    this.live = Boolean(this.token);
  }

  status() {
    return { live: this.live, mode: this.live ? 'bright-data' : 'simulated' };
  }

  /**
   * Collect threat signals. In live mode this would trigger a
   * Bright Data collection job against curated public sources.
   */
  async collectSignals({ limit = 48 } = {}) {
    if (!this.live) {
      return { source: 'simulated', signals: fb.generateSignals(limit) };
    }
    try {
      const res = await fetch(`${this.baseUrl}/datasets/v3/trigger`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zone: env.brightData.zone, limit }),
      });
      if (!res.ok) throw new Error(`Bright Data responded ${res.status}`);
      const raw = await res.json();
      return { source: 'bright-data', signals: this.#normalise(raw, limit) };
    } catch (err) {
      // Fail safe to simulated intel rather than breaking the OS.
      return { source: 'simulated-fallback', error: err.message, signals: fb.generateSignals(limit) };
    }
  }

  #normalise(raw, limit) {
    const items = Array.isArray(raw) ? raw : raw.items || [];
    if (!items.length) return fb.generateSignals(limit);
    return items.slice(0, limit).map((it, i) => ({
      id: it.id || `SIG-LIVE-${i}`,
      category: it.category || 'Vulnerability Exploit',
      headline: it.title || it.headline || 'Untitled intelligence signal',
      source: it.source || 'bright-data',
      sector: it.sector || 'Technology',
      region: it.region || 'NA',
      city: it.city || 'Unknown',
      lat: Number(it.lat || 0),
      lon: Number(it.lon || 0),
      severity: Number(it.severity || 5),
      confidence: Number(it.confidence || 70),
      first_seen: it.first_seen || new Date().toISOString(),
      tags: it.tags || [],
      url: it.url || '',
    }));
  }
}

export const brightData = new BrightDataService();
