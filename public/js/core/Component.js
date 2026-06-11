/**
 * Component — base class for every page and widget.
 *
 * Provides a consistent lifecycle (mount -> render -> afterRender ->
 * destroy) plus small DOM helpers and automatic listener cleanup.
 */
export class Component {
  constructor(props = {}) {
    this.props = props;
    this.el = null;
    this._cleanups = [];
  }

  /** Return an HTML string. Override in subclasses. */
  render() { return ''; }

  /** Called after the element is in the DOM. Override for wiring. */
  afterRender() {}

  mount(container) {
    container.innerHTML = this.render();
    this.el = container;
    this.afterRender();
    return this;
  }

  /** Register a teardown fn (listeners, intervals, three.js disposal). */
  onDestroy(fn) { this._cleanups.push(fn); }

  destroy() {
    this._cleanups.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
    this._cleanups = [];
  }

  /* DOM helpers */
  $(sel) { return this.el?.querySelector(sel); }
  $$(sel) { return Array.from(this.el?.querySelectorAll(sel) || []); }

  listen(target, event, handler, opts) {
    target.addEventListener(event, handler, opts);
    this.onDestroy(() => target.removeEventListener(event, handler, opts));
  }

  interval(fn, ms) {
    const id = setInterval(fn, ms);
    this.onDestroy(() => clearInterval(id));
    return id;
  }
}

/* Shared formatting helpers used across components. */
export const fmt = {
  sevBand(v) { return v >= 8 ? 'crit' : v >= 6 ? 'high' : v >= 4 ? 'med' : 'low'; },
  sevLabel(v) { return v >= 8 ? 'CRITICAL' : v >= 6 ? 'HIGH' : v >= 4 ? 'MEDIUM' : 'LOW'; },
  time(iso) { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return '--:--'; } },
  ago(iso) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return `${Math.floor(d)}s ago`;
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    return `${Math.floor(d / 3600)}h ago`;
  },
};
