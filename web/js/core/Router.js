import { bus } from './EventBus.js';

/**
 * Router — hash-based SPA router. Mounts the matching page Component
 * into the view container and destroys the previous one for clean
 * lifecycle management (important for the Three.js globe).
 */
export class Router {
  constructor(routes, outlet, options = {}) {
    this.routes = routes;          // { path: { title, factory } }
    this.outlet = outlet;
    this.current = null;
    this.beforeResolve = options.beforeResolve || null;
    window.addEventListener('hashchange', () => { void this.resolve(); });
  }

  start() { return this.resolve(); }

  navigate(path) {
    if (location.hash === `#${path}`) this.resolve();
    else location.hash = path;
  }

  async resolve() {
    const path = location.hash.replace('#', '') || '/command-center';
    const route = this.routes[path] || this.routes['/command-center'];
    if (this.beforeResolve) {
      const allowed = await this.beforeResolve(path, route);
      if (allowed === false) {
        this.outlet.innerHTML = '';
        return;
      }
    }

    if (this.current?.destroy) this.current.destroy();
    this.outlet.innerHTML = '';

    try {
      const page = route.factory();
      page.mount(this.outlet);
      this.current = page;
      bus.emit('route:change', { path, title: route.title });
    } catch (err) {
      console.error('[router] failed to mount route', path, err);
      this.outlet.innerHTML = `
        <div class="glass glass--cyan holo" style="max-width:720px;margin:24px;padding:24px">
          <div class="mono" style="font-size:.62rem;letter-spacing:2px;color:var(--sev-crit);text-transform:uppercase;margin-bottom:10px">Route Module Failed</div>
          <h2 style="margin:0 0 10px;font-family:var(--font-display);font-size:1.1rem">${route.title}</h2>
          <p class="dim" style="margin:0;line-height:1.6">${err?.message || 'The page could not be rendered.'}</p>
        </div>`;
      bus.emit('route:change', { path, title: route.title });
    }
  }
}
