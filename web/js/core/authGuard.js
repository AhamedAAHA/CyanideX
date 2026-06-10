import { getSupabase, loadProfile, saveSession, clearSessionCache } from './supabaseAuth.js';

export const AUTH_REQUIRED_MESSAGE = 'Authentication required. Please sign in to access CyanideX OS.';
const AUTH_NOTICE_KEY = 'cyanidex.auth.notice';

export function setAuthNotice(message = AUTH_REQUIRED_MESSAGE) {
  sessionStorage.setItem(AUTH_NOTICE_KEY, message);
}

export function consumeAuthNotice() {
  const message = sessionStorage.getItem(AUTH_NOTICE_KEY);
  sessionStorage.removeItem(AUTH_NOTICE_KEY);
  return message;
}

export function clearAuthState() {
  clearSessionCache();
}

export function appUrl(route = '/command-center') {
  return `app.html#${route}`;
}

async function validateSession(supabase) {
  const { data } = await supabase.auth.getSession();
  const session = data?.session || null;
  if (!session) return null;

  if (session.expires_at && Date.now() >= session.expires_at * 1000) {
    await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
    return null;
  }

  const { data: userData, error } = await supabase.auth.getUser();
  const user = userData?.user || null;
  if (error || !user) return null;

  return { session, user };
}

export class AuthGate {
  constructor({ signInUrl = 'signin.html', dashboardRoute = '/command-center' } = {}) {
    this.signInUrl = signInUrl;
    this.dashboardRoute = dashboardRoute;
    this.supabase = null;
    this._watcher = null;
  }

  async getClient() {
    if (this.supabase) return this.supabase;
    this.supabase = await getSupabase();
    return this.supabase;
  }

  async ensureAuthenticated({ notice = AUTH_REQUIRED_MESSAGE, redirect = true } = {}) {
    const supabase = await this.getClient();
    if (!supabase) return this.#fail(notice, redirect);

    const auth = await validateSession(supabase);
    if (!auth) return this.#fail(notice, redirect);

    return auth;
  }

  async hydrateSession({ fallbackEmail = '', redirectOnFailure = true } = {}) {
    const auth = await this.ensureAuthenticated({ redirect: redirectOnFailure });
    if (!auth) return null;
    const profile = await loadProfile(
      this.supabase,
      auth.user.id,
      fallbackEmail || auth.user.email || '',
      auth.user
    );
    saveSession({
      id: auth.user.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      access_token: auth.session.access_token,
    });
    return { ...auth, profile };
  }

  async restoreIfAuthenticated({ redirectOnFailure = false } = {}) {
    return this.hydrateSession({ redirectOnFailure });
  }

  async handleAuthStateChange(onSignedIn, onSignedOut) {
    const supabase = await this.getClient();
    if (!supabase) return () => {};

    if (this._watcher) {
      this._watcher.subscription.unsubscribe();
      this._watcher = null;
    }

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session || event === 'SIGNED_OUT') {
        clearAuthState();
        onSignedOut?.(event);
        return;
      }

      const validated = await validateSession(supabase);
      if (!validated) {
        clearAuthState();
        onSignedOut?.('INVALID');
        return;
      }

      const profile = await loadProfile(supabase, validated.user.id, validated.user.email || '', validated.user);
      saveSession({
        id: validated.user.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        access_token: validated.session.access_token,
      });
      onSignedIn?.({ ...validated, profile, event });
    });

    this._watcher = data;
    return () => {
      this._watcher?.subscription.unsubscribe();
      this._watcher = null;
    };
  }

  #fail(notice, redirect) {
    clearAuthState();
    if (redirect) {
      setAuthNotice(notice);
      window.location.replace(this.signInUrl);
    }
    return null;
  }
}
