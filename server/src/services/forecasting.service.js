import { brightData } from './brightData.service.js';
import { aiml } from './aiml.service.js';
import * as fb from '../data/fallback.js';
import { supabase } from '../lib/supabase.js';

const withTimeout = (promise, ms, label) => {
  let timeout;
  const timer = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timer]).finally(() => clearTimeout(timeout));
};

/**
 * Intelligence pipeline orchestrator.
 *
 * Coordinates OSINT collection -> AI forecasting -> Risk DNA ->
 * heatmap aggregation, and keeps an in-memory snapshot so every
 * page of the OS reads from a consistent threat picture. Refreshes
 * automatically on a timer to feel "live".
 */
class ForecastingPipeline {
  constructor() {
    this.snapshot = null;
    this.lastRefresh = 0;
    this.ttlMs = 60_000;
  }

  async getSnapshot({ force = false } = {}) {
    const stale = Date.now() - this.lastRefresh > this.ttlMs;
    if (force || stale || !this.snapshot) await this.refresh();
    return this.snapshot;
  }

  async refresh() {
    const collected = await withTimeout(
      brightData.collectSignals({ limit: 48 }),
      4_000,
      'Bright Data collection'
    ).catch((err) => ({
      source: 'simulated-timeout-fallback',
      error: err.message,
      signals: fb.generateSignals(48),
    }));

    const { signals, source } = collected;
    const analyses = await withTimeout(
      aiml.analyzeBatch(signals.slice(0, 18)),
      8_000,
      'AIML analysis'
    ).catch(() => signals.slice(0, 18).map((s) => fb.analyzeSignal(s)));
    const heatmap = fb.regionRiskHeatmap(signals);
    const attackPaths = fb.generateAttackPaths(signals);
    const riskDna = signals.slice(0, 12).map((s) => fb.riskDna(s));
    const briefing = await aiml.generateBriefing(signals, analyses, heatmap);

    this.snapshot = {
      generated_at: new Date().toISOString(),
      collection_source: source,
      signals,
      analyses,
      heatmap,
      attack_paths: attackPaths,
      risk_dna: riskDna,
      briefing,
      stats: this.#stats(signals, analyses, heatmap),
    };
    this.lastRefresh = Date.now();

    // Best-effort persistence; ignored silently if Supabase is offline.
    this.#persist().catch(() => {});
    return this.snapshot;
  }

  #stats(signals, analyses, heatmap) {
    const critical = signals.filter((s) => s.severity >= 8).length;
    const avgSeverity = signals.reduce((a, s) => a + s.severity, 0) / (signals.length || 1);
    const avgConfidence = analyses.reduce((a, x) => a + x.confidence, 0) / (analyses.length || 1);
    const topRegion = [...heatmap].sort((a, b) => b.risk_score - a.risk_score)[0];
    return {
      total_signals: signals.length,
      critical_signals: critical,
      avg_severity: Math.round(avgSeverity * 10) / 10,
      avg_confidence: Math.round(avgConfidence),
      highest_risk_region: topRegion?.name || '—',
      global_posture: avgSeverity > 7 ? 'ELEVATED' : avgSeverity > 5 ? 'GUARDED' : 'STABLE',
    };
  }

  async #persist() {
    if (!supabase.connected || !this.snapshot) return;
    await supabase.insert('threat_signals', this.snapshot.signals.slice(0, 10));
  }
}

export const pipeline = new ForecastingPipeline();
