import * as THREE from 'three';
import { buildLandDots } from './landDots.js';

/**
 * CyberGlobe — contained, production-ready 3D threat globe.
 *
 * Designed to live inside a sized panel (not a fullscreen background), so it
 * never fights page content for z-index/overflow. Features:
 *   • Centred, auto-rotating wireframe planet + fresnel atmosphere
 *   • Pulsing severity-coloured threat nodes (lat/lon) from /api/globe
 *   • Animated great-circle attack arcs with travelling pulses
 *   • Pointer drag to rotate (with inertia) + auto-resume
 *   • ResizeObserver-driven responsive sizing (stable on first paint)
 *   • IntersectionObserver pauses rendering when off-screen (perf)
 *   • prefers-reduced-motion aware
 *   • Hard try/catch around WebGL init → onError fallback
 *
 * Defensive visualisation only.
 */
export class CyberGlobe {
  constructor(container, { onReady, onError } = {}) {
    this.container = container;
    this.onReady = onReady;
    this.onError = onError;
    this._raf = null;
    this._disposables = [];
    this._nodes = [];
    this._arcs = [];
    this._rendered = false;
    this._visible = true;
    this._reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    this._drag = { active: false, x: 0, y: 0, vx: 0.0018, vy: 0 };

    try {
      this._init();
      this._bindPointer();
      this._observe();
      this._loadIntel();
      this._animate();
    } catch (err) {
      console.error('[v0] CyberGlobe init failed:', err);
      this.destroy();
      this.onError?.(err);
    }
  }

  _size() {
    const w = this.container.clientWidth || 480;
    const h = this.container.clientHeight || 480;
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  _init() {
    const { w, h } = this._size();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(0, 0.2, 6.2);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this._radius = 2.15;
    this._nodeTex = this._makeDotTexture();
    this._disposables.push(this._nodeTex);

    this._buildGlobe();
    this._buildAtmosphere();
    this._buildRings();
    this._buildStarfield();

    this.scene.add(new THREE.AmbientLight(0x1a2f42, 0.95));
    const key = new THREE.DirectionalLight(0x7df1ff, 1.4);
    key.position.set(4, 3, 6);
    this.scene.add(key);
    const rim = new THREE.PointLight(0xb6ff3a, 0.7, 24);
    rim.position.set(-5, -2, 3);
    this.scene.add(rim);
  }

  _buildGlobe() {
    const r = this._radius;

    const coreGeo = new THREE.SphereGeometry(r * 0.99, 64, 64);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x05111c,
      emissive: 0x02121c,
      emissiveIntensity: 0.6,
      roughness: 0.85,
      metalness: 0.2,
    });
    this.root.add(new THREE.Mesh(coreGeo, coreMat));
    this._disposables.push(coreGeo, coreMat);

    const wfGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(r, 36, 36));
    const wfMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.14 });
    this.root.add(new THREE.LineSegments(wfGeo, wfMat));
    this._disposables.push(wfGeo, wfMat);

    // Real continents: dotted landmass sampled from an equirectangular map so
    // recognisable countries appear instead of a random point cloud.
    buildLandDots({ url: 'assets/earth-landmask.png', radius: r, step: 1.05, color: 0x4cc6e6, size: 0.022, opacity: 0.62 })
      .then(({ points, dispose }) => {
        if (!this.root) { dispose(); return; }
        this._land = points;
        this.root.add(points);
        this._disposables.push({ dispose });
      });

    // Equator + meridian accent rings
    [0, Math.PI / 2].forEach((rot, i) => {
      const ringGeo = new THREE.TorusGeometry(r * 1.002, 0.006, 8, 120);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.22 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      if (i === 1) ring.rotation.y = Math.PI / 2;
      this.root.add(ring);
      this._disposables.push(ringGeo, ringMat);
    });
  }

  _buildAtmosphere() {
    const geo = new THREE.SphereGeometry(this._radius * 1.17, 64, 64);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        uColor: { value: new THREE.Color(0x00e5ff) },
        uPower: { value: 3.2 },
        uIntensity: { value: 0.42 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vView = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        uniform vec3 uColor;
        uniform float uPower;
        uniform float uIntensity;
        void main() {
          float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
          gl_FragColor = vec4(uColor, fres * uIntensity);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
    this._disposables.push(geo, mat);
  }

  _buildRings() {
    this.rings = [];
    [2.8, 3.25].forEach((radius, i) => {
      const geo = new THREE.TorusGeometry(radius, 0.01, 8, 140);
      const mat = new THREE.MeshBasicMaterial({ color: i === 1 ? 0xb6ff3a : 0x00e5ff, transparent: true, opacity: 0.16 - i * 0.05 });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2 + i * 0.22;
      this.scene.add(ring);
      this.rings.push(ring);
      this._disposables.push(geo, mat);
    });
  }

  _buildStarfield() {
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 38;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 38;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 38;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x5ec8e8, size: 0.05, transparent: true, opacity: 0.4, depthWrite: false });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
    this._disposables.push(geo, mat);
  }

  _makeDotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(48, 48, 1, 48, 48, 46);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(180,250,255,0.92)');
    g.addColorStop(0.5, 'rgba(0,229,255,0.3)');
    g.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(48, 48, 46, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
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

  _sevColor(sev) {
    if (sev >= 8) return 0xff3b5c;
    if (sev >= 6) return 0xffb12b;
    if (sev >= 4) return 0xb6ff3a;
    return 0x25f5a4;
  }

  async _loadIntel() {
    try {
      const res = await fetch('/api/globe');
      if (!res.ok) throw new Error('globe fetch failed');
      const data = await res.json();
      this.setData(data);
    } catch (err) {
      console.log('[v0] CyberGlobe intel unavailable, rendering static globe:', err.message);
    }
  }

  setData({ nodes = [], paths = [] } = {}) {
    nodes.slice(0, 26).forEach((n) => this._addNode(n));
    paths.slice(0, 10).forEach((p) => this._addArc(p));
  }

  _addNode(n) {
    const v = this._latLon(n.lat, n.lon, this._radius * 1.012);
    const col = this._sevColor(n.severity);
    const mat = new THREE.SpriteMaterial({ map: this._nodeTex, color: col, transparent: true, opacity: 0.95, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(v);
    sprite.scale.setScalar(0.2);
    this.root.add(sprite);
    this._nodes.push({ sprite, phase: Math.random() * Math.PI * 2 });
    this._disposables.push(mat);
  }

  _addArc(p) {
    const from = this._latLon(p.from.lat, p.from.lon, this._radius * 1.01);
    const to = this._latLon(p.to.lat, p.to.lon, this._radius * 1.01);
    const lift = this._radius * (1.25 + from.distanceTo(to) * 0.12);
    const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(lift);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const pts = curve.getPoints(48);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const col = this._sevColor(p.severity);
    const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.32 });
    const line = new THREE.Line(geo, mat);
    this.root.add(line);

    const pGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: col });
    const pulse = new THREE.Mesh(pGeo, pMat);
    this.root.add(pulse);

    this._arcs.push({ line, pulse, curve, t: Math.random(), speed: 0.0024 + (p.intensity || 0.5) * 0.004 });
    this._disposables.push(geo, mat, pGeo, pMat);
  }

  _bindPointer() {
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'pan-y';
    const down = (e) => { this._drag.active = true; this._drag.x = e.clientX; this._drag.y = e.clientY; };
    const move = (e) => {
      if (!this._drag.active) return;
      this._drag.vx = (e.clientX - this._drag.x) * 0.0002 + 0.0006;
      this._drag.vy = Math.max(-0.012, Math.min(0.012, (e.clientY - this._drag.y) * 0.00014));
      this._drag.x = e.clientX; this._drag.y = e.clientY;
    };
    const up = () => { this._drag.active = false; };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.container);
    }
    this._pointerCleanup = () => {
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    requestAnimationFrame(() => this._resize());
  }

  _observe() {
    if (typeof IntersectionObserver === 'undefined') return;
    this._io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { this._visible = e.isIntersecting; }),
      { threshold: 0.01 }
    );
    this._io.observe(this.container);
  }

  _animate() {
    this._raf = requestAnimationFrame(() => this._animate());
    if (!this._visible) return;

    const t = performance.now() * 0.001;
    const motion = this._reduced ? 0.3 : 1;

    if (!this._drag.active) this._drag.vx += (0.0018 * motion - this._drag.vx) * 0.02;
    this.root.rotation.y += this._drag.vx;
    this.root.rotation.x += this._drag.vy;
    this._drag.vy *= 0.92;
    this.root.rotation.x = Math.max(-0.6, Math.min(0.6, this.root.rotation.x));

    this.rings?.forEach((r, i) => { r.rotation.z = t * (0.08 + i * 0.05) * motion; });
    if (this.stars) this.stars.rotation.y = t * 0.01 * motion;

    this._nodes.forEach((n) => {
      const s = 0.18 + (Math.sin(t * 2.2 * motion + n.phase) * 0.5 + 0.5) * 0.12;
      n.sprite.scale.setScalar(s);
    });

    this._arcs.forEach((a) => {
      a.t = (a.t + a.speed * motion) % 1;
      a.pulse.position.copy(a.curve.getPoint(a.t));
    });

    this.renderer.render(this.scene, this.camera);

    if (!this._rendered) {
      this._rendered = true;
      this.onReady?.();
    }
  }

  _resize() {
    if (!this.renderer) return;
    const { w, h } = this._size();
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.setSize(w, h);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this._ro?.disconnect();
    this._io?.disconnect();
    this._pointerCleanup?.();
    this._disposables.forEach((d) => d?.dispose?.());
    this._disposables = [];
    this._nodes = [];
    this._arcs = [];
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement?.remove();
    }
  }
}
