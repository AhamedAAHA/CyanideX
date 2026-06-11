import { getSupabase, loadProfile, saveSession, enterApp, createDemoSession, restoreDemoSession } from './core/supabaseAuth.js?v=auth-fix-3';
import { consumeAuthNotice, clearAuthState } from './core/authGuard.js?v=auth-fix-3';

class SignInController {
  constructor() {
    this.form = document.getElementById('login-form');
    this.errorEl = document.getElementById('auth-error');
    this.submitBtn = this.form?.querySelector('button[type="submit"]');
    this.supabase = null;
    this.init();
  }

  async init() {
    this.supabase = await getSupabase();

    const notice = consumeAuthNotice();
    if (notice) this.showError(notice);

    if (!this.supabase) {
      if (restoreDemoSession()) {
        window.location.replace('app.html#/command-center');
        return;
      }
      this.bind();
      return;
    }

    const { data } = this.supabase ? await this.supabase.auth.getSession() : { data: null };
    const session = data?.session || null;
    if (session) {
      const { data: userData } = await this.supabase.auth.getUser();
      const user = userData?.user || null;
      if (user) {
        const profile = await loadProfile(this.supabase, user.id, user.email || '', user);
        saveSession({
          id: user.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          access_token: session.access_token,
        });
        window.location.replace('app.html#/command-center');
        return;
      }
      clearAuthState();
    }

    this.bind();
  }

  bind() {
    this.form?.addEventListener('submit', (e) => { e.preventDefault(); this.login(); });
    this.form?.addEventListener('input', () => this.clearError());
    document.querySelectorAll('[data-fill-email]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.clearError();
        document.getElementById('email').value = btn.dataset.fillEmail;
        document.getElementById('password').value = btn.dataset.fillPass;
      });
    });
  }

  showError(msg) {
    if (!this.errorEl) return;
    this.errorEl.textContent = msg;
    this.errorEl.classList.remove('hidden');
  }

  clearError() { this.errorEl?.classList.add('hidden'); }

  async login() {
    this.clearError();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return this.showError('Email and password are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return this.showError('Please enter a valid email address.');
    }
    if (!this.supabase) {
      createDemoSession({ email });
      enterApp(document.querySelector('.auth-card'));
      return;
    }

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'AUTHENTICATING…';

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await loadProfile(this.supabase, data.user.id, email, data.user);
      saveSession({
        id: data.user.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        access_token: data.session.access_token,
      });
      enterApp(document.querySelector('.auth-card'));
    } catch (err) {
      this.showError(err.message || 'Authentication failed.');
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'INITIALISE SESSION';
    }
  }
}

new SignInController();
