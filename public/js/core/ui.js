import { fmt } from './Component.js';

/** Toast notifications. */
let toastWrap;
let lastToast = { msg: '', ts: 0 };
export function toast(msg, ms = 3200) {
  // Prevent rapid duplicate toasts (e.g. unsupported SpeechRecognition firing twice).
  const now = Date.now();
  if (msg === lastToast.msg && now - lastToast.ts < 1200) return;
  lastToast = { msg, ts: now };

  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.className = 'cx-toast-wrap';
    document.body.appendChild(toastWrap);
  }
  const el = document.createElement('div');
  el.className = 'cx-toast';
  el.textContent = msg;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all .3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 320);
  }, ms);
}

/** Severity chip HTML. */
export function sevChip(sev) {
  const band = fmt.sevBand(sev);
  return `<span class="sev sev--${band}">${fmt.sevLabel(sev)} ${Number(sev).toFixed(1)}</span>`;
}

/** Radial confidence gauge HTML (value 0-100). */
export function gaugeHTML(value, label = 'CONFIDENCE') {
  const r = 56, c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return `
    <div class="gauge" style="margin:0 auto">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <defs>
          <linearGradient id="cxgauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#00e5ff"/>
            <stop offset="100%" stop-color="#b6ff3a"/>
          </linearGradient>
        </defs>
        <circle class="track" cx="66" cy="66" r="${r}"></circle>
        <circle class="arc" cx="66" cy="66" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
      </svg>
      <div class="num">${Math.round(value)}<span style="font-size:.7rem">%</span></div>
    </div>
    <div class="center mono" style="font-size:.6rem;letter-spacing:2px;color:var(--text-dim);margin-top:8px">${label}</div>`;
}

/** Linear meter HTML (value 0-100). */
export function meterHTML(value) {
  return `<div class="meter"><span style="width:${Math.max(2, Math.min(100, value))}%"></span></div>`;
}

/** Simple skeleton block. */
export function skeleton(height = 120) {
  return `<div class="skel" style="height:${height}px;width:100%"></div>`;
}
