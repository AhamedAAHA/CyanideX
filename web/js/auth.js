/**
 * Auth controller — Sign In + Sign Up (demo/local auth).
 *
 * Three pre-provisioned role accounts ship by default; new operators
 * registered via Sign Up are persisted in localStorage. This is a
 * demo flow — swap login()/register() for supabase.auth.* when going
 * live (Supabase keys are already configured in .env).
 */

const DEMO_ACCOUNTS = {
  'admin@cyanidex.io':   { password: 'Admin@CyanideX1',   role: 'Admin',   name: 'Nova Reyes' },
  'analyst@cyanidex.io': { password: 'Analyst@CyanideX1', role: 'Analyst', name: 'Kai Tanaka' },
  'viewer@cyanidex.io':  { password: 'Viewer@CyanideX1',  role: 'Viewer',  name: 'Sam Okafor' },
};

const STORE_KEY = 'cyanidex.accounts';

class AuthController {
  constructor() {
    this.role = 'Analyst';
    this.signupRole = 'Viewer';
    this.cacheEls();
    this.bind();
    this.applyInitialTab();
  }

  cacheEls() {
    this.tabs = document.getElementById('auth-tabs');
    this.signinForm = document.getElementById('signin-form');
    this.signupForm = document.getElementById('signup-form');
    this.rolePicker = document.getElementById('role-picker');
    this.rolePickerUp = document.getElementById('role-picker-up');
    this.siEmail = document.getElementById('si-email');
    this.siPass = document.getElementById('si-pass');
  }

  bind() {
    this.tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.auth-tab');
      if (tab) this.switchTab(tab.dataset.tab);
    });

    this.rolePicker.addEventListener('click', (e) => {
      const pick = e.target.closest('.role-pick');
      if (!pick) return;
      this.setRole(this.rolePicker, pick.dataset.role);
      this.role = pick.dataset.role;
      const entry = Object.entries(DEMO_ACCOUNTS).find(([, a]) => a.role === pick.dataset.role);
      if (entry) { this.siEmail.value = entry[0]; this.siPass.value = entry[1].password; }
    });

    this.rolePickerUp.addEventListener('click', (e) => {
      const pick = e.target.closest('.role-pick');
      if (!pick) return;
      this.setRole(this.rolePickerUp, pick.dataset.role);
      this.signupRole = pick.dataset.role;
    });

    this.siEmail.addEventListener('input', () => {
      const acc = DEMO_ACCOUNTS[this.siEmail.value.trim().toLowerCase()];
      if (acc) { this.role = acc.role; this.setRole(this.rolePicker, acc.role); }
    });

    this.signinForm.addEventListener('submit', (e) => { e.preventDefault(); this.login(); });
    this.signupForm.addEventListener('submit', (e) => { e.preventDefault(); this.register(); });
  }

  applyInitialTab() {
    const wantSignup = location.hash.replace('#', '') === 'signup';
    this.switchTab(wantSignup ? 'signup' : 'signin');
  }

  switchTab(tab) {
    this.tabs.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));
    this.signinForm.classList.toggle('hidden', tab !== 'signin');
    this.signupForm.classList.toggle('hidden', tab !== 'signup');
  }

  setRole(picker, role) {
    picker.querySelectorAll('.role-pick').forEach((p) => p.classList.toggle('is-active', p.dataset.role === role));
  }

  /* ── Local account store ─────────────────────────────────── */
  readAccounts() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  writeAccounts(accs) { localStorage.setItem(STORE_KEY, JSON.stringify(accs)); }

  /* ── Sign In ─────────────────────────────────────────────── */
  login() {
    const email = this.siEmail.value.trim().toLowerCase();
    const password = this.siPass.value;
    const local = this.readAccounts();
    const acc = DEMO_ACCOUNTS[email] || local[email];

    let role = this.role;
    let name;

    if (acc) {
      if (password !== acc.password) return this.shake('Invalid access key.');
      role = acc.role;
      name = acc.name;
    } else {
      name = (email.split('@')[0] || 'operator').replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    this.enter({ email, name: name || 'Operator', role });
  }

  /* ── Sign Up ─────────────────────────────────────────────── */
  register() {
    const name = document.getElementById('su-name').value.trim();
    const email = document.getElementById('su-email').value.trim().toLowerCase();
    const pass = document.getElementById('su-pass').value;
    const pass2 = document.getElementById('su-pass2').value;

    if (pass.length < 8) return this.shake('Access key must be at least 8 characters.');
    if (pass !== pass2) return this.shake('Access keys do not match.');
    if (DEMO_ACCOUNTS[email]) return this.shake('That email is reserved by a demo account.');

    const accounts = this.readAccounts();
    accounts[email] = { password: pass, role: this.signupRole, name: name || 'Operator' };
    this.writeAccounts(accounts);
    this.enter({ email, name: name || 'Operator', role: this.signupRole });
  }

  /* ── Session + transition ────────────────────────────────── */
  enter({ email, name, role }) {
    const session = {
      email, name, role,
      issued_at: new Date().toISOString(),
      token: 'cx-demo-' + Math.random().toString(36).slice(2),
    };
    localStorage.setItem('cyanidex.session', JSON.stringify(session));
    const card = document.querySelector('.auth-card');
    card.style.transition = 'all .5s var(--ease)';
    card.style.transform = 'scale(1.05)';
    card.style.opacity = '0';
    setTimeout(() => (window.location.href = 'app.html'), 480);
  }

  shake(msg) {
    const card = document.querySelector('.auth-card');
    card.style.animation = 'none';
    requestAnimationFrame(() => { card.style.animation = 'cxShake .4s'; });
    if (msg) {
      let n = document.getElementById('auth-err');
      if (!n) {
        n = document.createElement('div');
        n.id = 'auth-err';
        n.className = 'auth-err';
        document.querySelector('.auth-card').appendChild(n);
      }
      n.textContent = '⚠ ' + msg;
      clearTimeout(this._errT);
      this._errT = setTimeout(() => n.remove(), 3200);
    }
  }
}

new AuthController();
