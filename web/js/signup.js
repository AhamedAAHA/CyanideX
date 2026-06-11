import { getSupabase, loadProfile, saveSession, enterApp, createDemoSession, restoreDemoSession } from './core/supabaseAuth.js?v=auth-fix-3';
import { clearAuthState } from './core/authGuard.js?v=auth-fix-3';

class SignUpController {
  constructor() {
    this.form = document.getElementById('signup-form');
    this.errorEl = document.getElementById('auth-error');
    this.successEl = document.getElementById('auth-success');
    this.submitBtn = this.form?.querySelector('button[type="submit"]');
    this.supabase = null;
    this.init();
  }

  async init() {
    this.supabase = await getSupabase();

    if (!this.supabase) {
      if (restoreDemoSession()) {
        window.location.replace('app.html#/command-center');
        return;
      }
      this.form?.addEventListener('submit', (e) => { e.preventDefault(); this.signup(); });
      this.form?.addEventListener('input', () => this.errorEl?.classList.add('hidden'));
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

    this.form?.addEventListener('submit', (e) => { e.preventDefault(); this.signup(); });
  }

  showError(msg) {
    this.successEl?.classList.add('hidden');
    if (!this.errorEl) return;
    this.errorEl.textContent = msg;
    this.errorEl.classList.remove('hidden');
  }

  showSuccess(msg) {
    this.errorEl?.classList.add('hidden');
    if (!this.successEl) return;
    this.successEl.textContent = msg;
    this.successEl.classList.remove('hidden');
  }

  async signup() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    if (!name || !email || !password) return this.showError('All fields are required.');
    if (password.length < 8) return this.showError('Password must be at least 8 characters.');
    if (password !== confirm) return this.showError('Passwords do not match.');
    if (!this.supabase) {
      createDemoSession({ email, name, role: 'Viewer' });
      enterApp(document.querySelector('.auth-card'));
      return;
    }

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'CREATING ACCOUNT…';

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;

      // If email confirmation is off, session is returned immediately.
      if (data.session) {
        const profile = await loadProfile(this.supabase, data.user.id, email, data.user);
        saveSession({
          id: data.user.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          access_token: data.session.access_token,
        });
        enterApp(document.querySelector('.auth-card'));
        return;
      }

      this.showSuccess('Account created. Check your email to confirm, then Sign In.');
      this.submitBtn.textContent = 'ACCOUNT CREATED';
      setTimeout(() => { window.location.href = 'signin.html'; }, 2800);
    } catch (err) {
      this.showError(err.message || 'Registration failed.');
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'CREATE OPERATOR ACCOUNT';
    }
  }
}

new SignUpController();
