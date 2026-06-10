import { bus } from './EventBus.js';

/**
 * Router — hash-based SPA router. Mounts the matching page Component
 * into the view container and destroys the previous one for clean
 * lifecycle management (important for the Three.js globe).
 */
export class Router {
  constructor(routes, outlet) {
    this.routes = routes;          // { path: { title, factory } }
    this.outlet = outlet;
    this.current = null;
    window.addEventListener('hashchange', () => this.resolve());
  }

  start() { this.resolve(); }

  navigate(path) {
    if (location.hash === `#${path}`) this.resolve();
    else location.hash = path;
  }

  resolve() {
    const path = location.hash.replace('#', '') || '/command-center';
    const route = this.routes[path] || this.routes['/command-center'];

    if (this.current?.destroy) this.current.destroy();
    this.outlet.innerHTML = '';

    const page = route.factory();
    page.mount(this.outlet);
    this.current = page;

    bus.emit('route:change', { path, title: route.title });
  }
}
