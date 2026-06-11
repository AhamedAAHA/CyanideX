import * as THREE from 'three';
import { bus } from '../core/EventBus.js';
import { buildLandDots } from './landDots.js';

/**
 * ThreatGlobe — animated 3D cyber threat globe.
 *
 * Renders a wireframe planet with an atmospheric glow, pulsing threat
 * nodes positioned by lat/lon, and animated great-circle attack arcs.
 * Severity drives colour (toxic-green → amber → red). Purely a
 * *visualisation* of defensive intel — no live infrastructure.
 */
export class ThreatGlobe {
  constructor(container, { radius = 2 } = {}) {
    this.container = container;
    this.radius = radius;
    this.nodes = [];
    this.arcs = [];
    this._raf = null;
    this._init();
  }

  _init() {
    const w = this.container.clientWidth || 600;
    const h = this.container.clientHeight || 480;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0.4, 6.4);
    this.camera.lookAt(0, 0, 0); // keep the globe centred in frame

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this._buildGlobe();
    this._buildAtmosphere();
    this._buildStarfield();

    this.scene.add(new THREE.AmbientLight(0x335577, 1.1));
    const key = new THREE.DirectionalLight(0x00e5ff, 1.3);
    key.position.set(5, 3, 5);
    this.scene.add(key);

    // Pointer drag to rotate
    this._drag = { active: false, x: 0, y: 0, vx: 0.0016, vy: 0 };
    this._bindPointer();

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);

    // Re-fit whenever the container finishes laying out (grid/flex cards
    // often report height 0 on first paint, which clipped the globe).
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.container);
    }
    requestAnimationFrame(() => this._resize());

    this._animate();
  }

  _buildGlobe() {
    // Solid dim core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 0.985, 48, 48),
      new THREE.MeshPhongMaterial({ color: 0x041018, emissive: 0x021016, shininess: 12, transparent: true, opacity: 0.92 })
    );
    this.root.add(core);

    // Cyan wireframe shell
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 36, 36),
      new THREE.MeshBasicMaterial({ color: 0x0bb6cc, wireframe: true, transparent: true, opacity: 0.16 })
    );
    this.root.add(wire);

    // Dotted "continents" — sampled from an equirectangular land mask so real
    // countries/coastlines are visible instead of a random scatter.
    buildLandDots({ url: '/assets/earth-landmask.png', radius: this.radius, step: 1.05, color: 0x2f9ab0, size: 0.02, opacity: 0.62 })
      .then(({ points, dispose }) => {
        if (!this.root) { dispose(); return; }
        this._land = points;
        this.root.add(points);
        this._landDispose = dispose;
      });

    // Equator + meridian accent rings
    [0, Math.PI / 2].forEach((rot, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(this.radius * 1.001, 0.004, 8, 90),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25 })
      );
      if (i === 1) ring.rotation.y = Math.PI / 2;
      ring.rotation.x = Math.PI / 2;
      this.root.add(ring);
    });
  }

  _buildAtmosphere() {
    const geo = new THREE.SphereGeometry(this.radius * 1.18, 48, 48);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: { c: { value: new THREE.Color(0x00e5ff) } },
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
      fragmentShader: `varying vec3 vN; uniform vec3 c; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(c, 1.0) * i; }`,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  _buildStarfield() {
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x6fa9c4, size: 0.05, transparent: true, opacity: 0.5 })));
  }

  /* ── Public data API ─────────────────────────────────────── */

  setData({ nodes = [], paths = [] }) {
    this._clearNodes();
    this._clearArcs();
    nodes.forEach((n) => this._addNode(n));
    paths.forEach((p) => this._addArc(p));
  }

  _addNode(n) {
    const v = this._latLonToVec(n.lat, n.lon, this.radius * 1.01);
    const color = this._sevColor(n.severity);
    const mat = new THREE.MeshBasicMaterial({ color });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), mat);
    dot.position.copy(v);
    dot.userData = n;
    this.root.add(dot);

    // pulsing ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.05, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    ring.position.copy(v);
    ring.lookAt(0, 0, 0);
    this.root.add(ring);

    this.nodes.push({ dot, ring, phase: Math.random() * Math.PI * 2, base: 0.04 });
  }

  _addArc(p) {
    const from = this._latLonToVec(p.from.lat, p.from.lon, this.radius * 1.01);
    const to = this._latLonToVec(p.to.lat, p.to.lon, this.radius * 1.01);
    const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(this.radius * (1.25 + from.distanceTo(to) * 0.15));
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const pts = curve.getPoints(50);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const color = this._sevColor(p.severity);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }));
    this.root.add(line);

    // Travelling pulse along the arc
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), new THREE.MeshBasicMaterial({ color }));
    this.root.add(pulse);
    this.arcs.push({ line, pulse, curve, t: Math.random(), speed: 0.0025 + p.intensity * 0.004 });
  }

  /* ── Helpers ─────────────────────────────────────────────── */

  _latLonToVec(lat, lon, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  _spherePoint(r) {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  _sevColor(sev) {
    if (sev >= 8) return new THREE.Color(0xff3b5c);
    if (sev >= 6) return new THREE.Color(0xffb12b);
    if (sev >= 4) return new THREE.Color(0xb6ff3a);
    return new THREE.Color(0x25f5a4);
  }

  _clearNodes() {
    this.nodes.forEach(({ dot, ring }) => { this.root.remove(dot); this.root.remove(ring); dot.geometry.dispose(); ring.geometry.dispose(); });
    this.nodes = [];
  }
  _clearArcs() {
    this.arcs.forEach(({ line, pulse }) => { this.root.remove(line); this.root.remove(pulse); line.geometry.dispose(); pulse.geometry.dispose(); });
    this.arcs = [];
  }

  _bindPointer() {
    const dom = this.renderer.domElement;
    const down = (e) => { this._drag.active = true; this._drag.x = e.clientX; this._drag.y = e.clientY; };
    const move = (e) => {
      if (!this._drag.active) return;
      this._drag.vx = (e.clientX - this._drag.x) * 0.00018 + 0.0016;
      this._drag.vy = Math.max(-0.01, Math.min(0.01, (e.clientY - this._drag.y) * 0.00012));
      this._drag.x = e.clientX; this._drag.y = e.clientY;
    };
    const up = () => { this._drag.active = false; };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    this._pointerCleanup = () => {
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }

  _animate() {
    const t = performance.now() * 0.001;
    this.root.rotation.y += this._drag.vx;
    this.root.rotation.x += this._drag.vy;
    this._drag.vy *= 0.94;

    this.nodes.forEach((n) => {
      const s = 1 + Math.sin(t * 3 + n.phase) * 0.5;
      n.ring.scale.setScalar(s);
      n.ring.material.opacity = 0.7 - (s - 1) * 0.9;
    });

    this.arcs.forEach((a) => {
      a.t = (a.t + a.speed) % 1;
      a.pulse.position.copy(a.curve.getPoint(a.t));
    });

    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(() => this._animate());
  }

  _resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this._ro?.disconnect();
    this._pointerCleanup?.();
    this._landDispose?.();
    this._clearNodes();
    this._clearArcs();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
