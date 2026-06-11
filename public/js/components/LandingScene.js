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
    this.disposables = [];
    this.nodes = [];
    this.arcs = [];
    this._nodeTex = null;
    this._netMat = null;
    this._lookAtX = 0.55;
    this._reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
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

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this._buildGlobe();
    this._buildRings();
    this._buildParticles();
    this._buildNetworkLinks();
    this._buildGrid();
    this._buildScanner();
    this._layoutScene(w);

    this.scene.add(new THREE.AmbientLight(0x1a2f42, 0.85));
    const key = new THREE.DirectionalLight(0x7df1ff, 1.35);
    key.position.set(4, 2, 6);
    this.scene.add(key);
    const rim = new THREE.PointLight(0xb6ff3a, 0.8, 20);
    rim.position.set(-4, -2, 3);
    this.scene.add(rim);
    const fill = new THREE.PointLight(0x00e5ff, 0.65, 18);
    fill.position.set(2, 1.2, -4);
    this.scene.add(fill);

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._animate();
  }

  _buildGlobe() {
    const r = 2.22;

    this._nodeTex = this._makeDotTexture();
    this.disposables.push(this._nodeTex);

    const globeGeo = new THREE.SphereGeometry(r * 0.99, 72, 72);
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0x040f18,
      emissive: 0x021018,
      emissiveIntensity: 0.7,
      roughness: 0.82,
      metalness: 0.18,
      transparent: true,
      opacity: 0.95,
    });
    this.globe = new THREE.Mesh(globeGeo, globeMat);
    this.root.add(this.globe);
    this.disposables.push(globeGeo, globeMat);

    // Crisp wireframe overlay using line segments (reads more "OS" than a wireframe material).
    const wfGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(r, 42, 42));
    const wfMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.12 });
    this.wire = new THREE.LineSegments(wfGeo, wfMat);
    this.root.add(this.wire);
    this.disposables.push(wfGeo, wfMat);

    // Latitude/longitude bands
    const ll = this._latLongLines(r * 1.003, 20, 32);
    this.root.add(ll);

    // Subtle point cloud (data nodes on surface)
    const dots = 1500;
    const pos = new Float32Array(dots * 3);
    for (let i = 0; i < dots; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const rr = r * 1.004;
      pos[i * 3] = rr * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = rr * Math.cos(phi);
      pos[i * 3 + 2] = rr * Math.sin(phi) * Math.sin(theta);
    }
    const dotsGeo = new THREE.BufferGeometry();
    dotsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dotsMat = new THREE.PointsMaterial({ color: 0x66d9ff, size: 0.018, transparent: true, opacity: 0.28, depthWrite: false });
    this.dots = new THREE.Points(dotsGeo, dotsMat);
    this.root.add(this.dots);
    this.disposables.push(dotsGeo, dotsMat);

    // Fresnel-like atmosphere (shader) for premium depth.
    const atmoGeo = new THREE.SphereGeometry(r * 1.16, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(0x00e5ff) },
        uPower: { value: 2.1 },
        uIntensity: { value: 0.55 },
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
          float a = fres * uIntensity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      side: THREE.BackSide,
    });
    this.atmo = new THREE.Mesh(atmoGeo, atmoMat);
    this.scene.add(this.atmo);
    this.disposables.push(atmoGeo, atmoMat);
  }

  _makeDotTexture() {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(48, 48, 2, 48, 48, 44);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(160,245,255,0.92)');
    g.addColorStop(0.45, 'rgba(0,229,255,0.28)');
    g.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(48, 48, 46, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
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
      this.disposables.push(ring.geometry, ring.material);
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
    const mat = new THREE.PointsMaterial({ color: 0x5ec8e8, size: 0.055, transparent: true, opacity: 0.38, depthWrite: false });
    this.particles = new THREE.Points(g, mat);
    this.scene.add(this.particles);
    this.disposables.push(g, mat);
  }

  _buildNetworkLinks() {
    // Lightweight "network mesh" links on/above the surface.
    const segs = 160;
    const r = 2.26;
    const pos = new Float32Array(segs * 2 * 3);
    for (let i = 0; i < segs; i++) {
      const a = this._randOnSphere(r);
      const b = this._randOnSphere(r * (0.98 + Math.random() * 0.06));
      const o = i * 6;
      pos[o] = a.x; pos[o + 1] = a.y; pos[o + 2] = a.z;
      pos[o + 3] = b.x; pos[o + 4] = b.y; pos[o + 5] = b.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.05, depthWrite: false });
    const lines = new THREE.LineSegments(geo, mat);
    this.root.add(lines);
    this._netMat = mat;
    this.disposables.push(geo, mat);
  }

  _randOnSphere(r) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  _buildGrid() {
    const grid = new THREE.GridHelper(24, 40, 0x0bb6cc, 0x062028);
    grid.position.y = -3.2;
    grid.material.opacity = 0.18;
    grid.material.transparent = true;
    this.scene.add(grid);
    this.disposables.push(grid.geometry, grid.material);
  }

  _buildScanner() {
    // Subtle scanning sweep around the globe (kept lightweight).
    const geo = new THREE.RingGeometry(2.55, 4.25, 96, 1, 0, Math.PI / 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.sweep = new THREE.Mesh(geo, mat);
    this.sweep.rotation.x = Math.PI / 2.15;
    this.scene.add(this.sweep);
    this.disposables.push(geo, mat);
  }

  _latLongLines(r, latBands = 18, lonBands = 30) {
    const pts = [];
    const stepLon = (Math.PI * 2) / lonBands;
    const stepLat = Math.PI / latBands;

    // Longitudes
    for (let lon = 0; lon < lonBands; lon++) {
      const theta = lon * stepLon;
      for (let i = 0; i <= 90; i++) {
        const phi = i * (Math.PI / 90);
        pts.push(new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ));
      }
    }

    // Latitudes
    for (let lat = 1; lat < latBands; lat++) {
      const phi = lat * stepLat;
      for (let i = 0; i <= lonBands; i++) {
        const theta = i * stepLon;
        pts.push(new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ));
      }
    }

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.06, depthWrite: false });
    const lines = new THREE.Line(geo, mat);
    this.disposables.push(geo, mat);
    return lines;
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
        const v = this._latLon(n.lat, n.lon, 2.23);
        const col = n.severity >= 8 ? 0xff3b5c : n.severity >= 6 ? 0xffb12b : 0xb6ff3a;
        const dotMat = new THREE.SpriteMaterial({
          map: this._nodeTex,
          color: col,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        });
        const dot = new THREE.Sprite(dotMat);
        dot.position.copy(v);
        dot.scale.set(0.22, 0.22, 1);
        this.root.add(dot);
        this.nodes.push(dot);
        this.disposables.push(dotMat);
      });
      (data.paths || []).slice(0, 9).forEach((p) => this._addArc(p));
    } catch { /* static globe still renders */ }
  }

  _addArc(p) {
    const from = this._latLon(p.from.lat, p.from.lon, 2.23);
    const to = this._latLon(p.to.lat, p.to.lon, 2.23);
    const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(3.35);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const pts = curve.getPoints(40);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0x7df1ff,
      transparent: true,
      opacity: 0.28,
      dashSize: 0.22,
      gapSize: 0.18,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    this.root.add(line);
    this.arcs.push(line);
    this.disposables.push(geo, mat);
  }

  _animate() {
    const t = performance.now() * 0.001;
    const motion = this._reducedMotion ? 0.35 : 1;

    this.root.rotation.y = t * 0.16 * motion;
    this.root.rotation.x = Math.sin(t * 0.12) * 0.045 * motion;

    this.camera.position.x = Math.sin(t * 0.16) * 0.14;
    this.camera.position.y = 0.8 + Math.cos(t * 0.11) * 0.08;
    this.camera.lookAt(this._lookAtX, 0, 0);

    this.rings?.forEach((r, i) => { r.rotation.z = t * (0.075 + i * 0.04) * motion; });
    if (this.sweep) {
      this.sweep.rotation.z = t * 0.62 * motion;
      this.sweep.material.opacity = 0.055 + (Math.sin(t * 1.2) * 0.5 + 0.5) * 0.05;
    }

    this.nodes.forEach((node, i) => {
      const pulse = 1 + Math.sin(t * 2.0 * motion + i * 0.7) * 0.26;
      node.scale.setScalar(pulse);
    });

    this.arcs.forEach((arc, i) => {
      const mat = arc.material;
      mat.dashOffset = -(t * 0.55 * motion) - i * 0.15;
      mat.opacity = 0.18 + (Math.sin(t * 1.1 + i) * 0.5 + 0.5) * 0.16;
    });

    if (this._netMat) {
      this._netMat.opacity = 0.035 + (Math.sin(t * 0.9) * 0.5 + 0.5) * 0.035;
    }

    if (this.particles) this.particles.rotation.y = t * 0.025 * motion;
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(() => this._animate());
  }

  _resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(w, h);
    this._layoutScene(w);
  }

  _layoutScene(w) {
    let scale = 0.82;
    let x = 0.55;
    let y = 0.12;

    if (w >= 1600) {
      scale = 1.8;
      x = 2.65;
      y = -0.05;
    } else if (w >= 1180) {
      scale = 1.45;
      x = 2.25;
      y = -0.02;
    } else if (w >= 760) {
      scale = 0.96;
      x = 1.05;
      y = 0.05;
    }

    this.root.position.set(x, y, 0);
    this.root.scale.setScalar(scale);
    // Keep the camera target tracking the framed globe position.
    this._lookAtX = Math.min(1.35, x * 0.52);

    if (this.atmo) {
      this.atmo.position.set(x, y, 0);
      this.atmo.scale.setScalar(scale);
    }

    this.rings?.forEach((ring) => {
      ring.position.set(x, y, 0);
      ring.scale.setScalar(scale);
    });

    if (this.sweep) {
      this.sweep.position.set(x, y, 0);
      this.sweep.scale.setScalar(scale);
    }
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.disposables.forEach((item) => item?.dispose?.());
    this.disposables = [];
    this.nodes = [];
    this.arcs = [];
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
