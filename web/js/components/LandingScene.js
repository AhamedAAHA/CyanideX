import * as THREE from 'three';

/**
 * LandingScene — fullscreen hero 3D background for the main page.
 * Auto-rotating cyber globe, orbital rings, particle field and
 * animated attack arcs. Defensive visualisation only.
 */
export class LandingScene {
  constructor(container) {
    this.container = container;
    this._raf = null;
    this._init();
    this._loadIntel();
  }

  _init() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x03060a, 0.045);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 120);
    this.camera.position.set(0, 0.8, 7.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this._buildGlobe();
    this._buildRings();
    this._buildParticles();
    this._buildGrid();
    this._layoutScene(w);

    this.scene.add(new THREE.AmbientLight(0x224466, 0.9));
    const key = new THREE.DirectionalLight(0x00e5ff, 1.4);
    key.position.set(4, 2, 6);
    this.scene.add(key);
    const rim = new THREE.PointLight(0xb6ff3a, 0.8, 20);
    rim.position.set(-4, -2, 3);
    this.scene.add(rim);

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._animate();
  }

  _buildGlobe() {
    const r = 2.2;
    this.root.add(new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.99, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x041018, emissive: 0x021016, shininess: 18, transparent: true, opacity: 0.95 })
    ));
    this.root.add(new THREE.Mesh(
      new THREE.SphereGeometry(r, 40, 40),
      new THREE.MeshBasicMaterial({ color: 0x0bb6cc, wireframe: true, transparent: true, opacity: 0.14 })
    ));

    const dots = 1800;
    const pos = new Float32Array(dots * 3);
    for (let i = 0; i < dots; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const rr = r * 1.002;
      pos[i * 3] = rr * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = rr * Math.cos(phi);
      pos[i * 3 + 2] = rr * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x1d8a9e, size: 0.02, transparent: true, opacity: 0.55 })));

    // Atmospheric glow
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(r * 1.22, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.06, side: THREE.BackSide })
    );
    this.atmo = atmo;
    this.scene.add(this.atmo);
  }

  _buildRings() {
    [2.9, 3.4, 3.9].forEach((radius, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 8, 120),
        new THREE.MeshBasicMaterial({ color: i === 1 ? 0xb6ff3a : 0x00e5ff, transparent: true, opacity: 0.22 - i * 0.04 })
      );
      ring.rotation.x = Math.PI / 2 + i * 0.18;
      ring.rotation.y = i * 0.4;
      this.rings = this.rings || [];
      this.rings.push(ring);
      this.scene.add(ring);
    });
  }

  _buildParticles() {
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particles = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x5ec8e8, size: 0.06, transparent: true, opacity: 0.45 }));
    this.scene.add(this.particles);
  }

  _buildGrid() {
    const grid = new THREE.GridHelper(24, 40, 0x0bb6cc, 0x062028);
    grid.position.y = -3.2;
    grid.material.opacity = 0.18;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  _latLon(lat, lon, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  async _loadIntel() {
    try {
      const data = await fetch('/api/globe').then((r) => r.json());
      const nodes = (data.nodes || []).slice(0, 24);
      nodes.forEach((n) => {
        const v = this._latLon(n.lat, n.lon, 2.21);
        const col = n.severity >= 8 ? 0xff3b5c : n.severity >= 6 ? 0xffb12b : 0xb6ff3a;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 8, 8),
          new THREE.MeshBasicMaterial({ color: col })
        );
        dot.position.copy(v);
        this.root.add(dot);
      });
      (data.paths || []).slice(0, 8).forEach((p) => this._addArc(p));
    } catch { /* static globe still renders */ }
  }

  _addArc(p) {
    const from = this._latLon(p.from.lat, p.from.lon, 2.21);
    const to = this._latLon(p.to.lat, p.to.lon, 2.21);
    const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(3.2);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const pts = curve.getPoints(40);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.28 })
    );
    this.root.add(line);
  }

  _animate() {
    const t = performance.now() * 0.001;
    this.root.rotation.y = t * 0.22;
    this.root.rotation.x = Math.sin(t * 0.15) * 0.08;
    this.rings?.forEach((r, i) => { r.rotation.z = t * (0.08 + i * 0.04); });
    if (this.particles) this.particles.rotation.y = t * 0.03;
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(() => this._animate());
  }

  _resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this._layoutScene(w);
  }

  _layoutScene(w) {
    const desktop = w >= 980;
    const scale = desktop ? 1.85 : 1.1;
    const x = desktop ? 2.45 : 0.35;
    const y = desktop ? -0.05 : 0.45;

    this.root.position.set(x, y, 0);
    this.root.scale.setScalar(scale);

    if (this.atmo) {
      this.atmo.position.set(x, y, 0);
      this.atmo.scale.setScalar(scale);
    }

    this.rings?.forEach((ring) => {
      ring.position.set(x, y, 0);
      ring.scale.setScalar(scale);
    });
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
