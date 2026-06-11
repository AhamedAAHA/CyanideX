import { bus } from './EventBus.js';

/**
 * Store — tiny reactive state container. Holds the shared
 * intelligence snapshot, the active session and UI selections.
 */
export class Store {
  constructor(initial = {}) {
    this.state = { ...initial };
  }

  get(key) { return this.state[key]; }

  set(patch) {
    this.state = { ...this.state, ...patch };
    bus.emit('store:change', this.state);
    Object.keys(patch).forEach((k) => bus.emit(`store:${k}`, this.state[k]));
  }

  get session() {
    try { return JSON.parse(localStorage.getItem('cyanidex.session')); }
    catch { return null; }
  }

  clearSession() { localStorage.removeItem('cyanidex.session'); }
}

export const store = new Store({
  snapshot: null,
  status: null,
  selectedSignal: null,
});
