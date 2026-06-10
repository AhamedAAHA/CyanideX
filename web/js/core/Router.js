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

    const page = route.factory();
    page.mount(this.outlet);
    this.current = page;

    bus.emit('route:change', { path, title: route.title });
  }
}
