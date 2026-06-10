import { env } from '../config/env.js';

/**
 * Lightweight Supabase REST helper.
 *
 * We intentionally avoid a heavy SDK dependency: CyanideX only needs
 * a few REST calls. When Supabase credentials are absent the helper
 * reports "disconnected" and callers fall back to the simulated corpus.
 */
class SupabaseGateway {
  constructor() {
    this.url = env.supabase.url;
    this.key = env.supabase.serviceRoleKey || env.supabase.anonKey;
    this.connected = Boolean(this.url && this.key);
  }

  headers() {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  async select(table, query = '') {
    if (!this.connected) return { ok: false, reason: 'supabase-disconnected', data: null };
    try {
      const res = await fetch(`${this.url}/rest/v1/${table}?${query}`, { headers: this.headers() });
      const data = await res.json();
      return { ok: res.ok, data };
    } catch (err) {
      return { ok: false, reason: err.message, data: null };
    }
  }

  async insert(table, rows) {
    if (!this.connected) return { ok: false, reason: 'supabase-disconnected', data: null };
    try {
      const res = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(rows),
      });
      const data = await res.json();
      return { ok: res.ok, data };
    } catch (err) {
      return { ok: false, reason: err.message, data: null };
    }
  }
}

export const supabase = new SupabaseGateway();
