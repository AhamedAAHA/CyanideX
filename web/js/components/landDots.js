import * as THREE from 'three';

/**
 * landDots — builds a "dotted landmass" point cloud for a globe by sampling an
 * equirectangular black/white land mask (white = land, black = ocean).
 *
 * Returns a Promise resolving to a THREE.Points object (already positioned on a
 * sphere of the given radius) plus a disposer. Dots are only placed where the
 * underlying map pixel is land, so real continents/countries become visible.
 *
 * lat/lon → vector math is kept identical to the globes' _latLon() helpers so
 * threat nodes line up with the correct countries.
 */
export function buildLandDots({
  url = 'assets/earth-landmask.png',
  radius = 2.0,
  step = 1.1,          // degrees between samples (smaller = denser)
  color = 0x3fb6d6,
  size = 0.02,
  opacity = 0.6,
  threshold = 120,     // luminance cutoff for "land"
} = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const fail = (reason) => {
      console.log('[v0] landDots fallback (random sphere):', reason);
      resolve(randomSphereDots({ radius, color, size, opacity }));
    };

    img.onload = () => {
      try {
        const cw = 720, ch = 360;
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, cw, ch);
        const { data } = ctx.getImageData(0, 0, cw, ch);

        const positions = [];
        for (let lat = 85; lat >= -85; lat -= step) {
          for (let lon = -180; lon < 180; lon += step) {
            const u = (lon + 180) / 360;
            const v = (90 - lat) / 180;
            const px = Math.min(cw - 1, Math.max(0, Math.round(u * cw)));
            const py = Math.min(ch - 1, Math.max(0, Math.round(v * ch)));
            const idx = (py * cw + px) * 4;
            const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (lum < threshold) continue; // ocean → skip

            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);
            const rr = radius * 1.003;
            positions.push(
              -rr * Math.sin(phi) * Math.cos(theta),
              rr * Math.cos(phi),
              rr * Math.sin(phi) * Math.sin(theta)
            );
          }
        }

        if (positions.length < 50) return fail('no land sampled');
        resolve(makePoints(positions, { color, size, opacity }));
      } catch (err) {
        fail(err.message || 'sampling error');
      }
    };

    img.onerror = () => fail('image load error');
    img.src = url;
  });
}

function makePoints(positionsArray, { color, size, opacity }) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positionsArray), 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  return { points, dispose: () => { geo.dispose(); mat.dispose(); } };
}

function randomSphereDots({ radius, color, size, opacity }) {
  const n = 1300;
  const positions = [];
  for (let i = 0; i < n; i++) {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const rr = radius * 1.003;
    positions.push(
      rr * Math.sin(phi) * Math.cos(theta),
      rr * Math.cos(phi),
      rr * Math.sin(phi) * Math.sin(theta)
    );
  }
  return makePoints(positions, { color, size, opacity });
}
