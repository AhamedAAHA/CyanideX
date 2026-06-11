import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

let _client = null;
const SESSION_KEY = 'cyanidex.session';
const DEMO_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function getSupabase() {
  if (_client) return _client;
  const cfg = await fetch('/api/config/public').then((r) => r.json()).catch(() => ({}));
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  _client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

function demoRoleFromEmail(email) {
  const normalized = String(email || '').toLowerCase();
  if (normalized.includes('admin')) return 'Admin';
  if (normalized.includes('analyst')) return 'Analyst';
  return 'Viewer';
}

function demoNameFromEmail(email) {
  const local = String(email || 'operator').split('@')[0] || 'operator';
  return local
    .replace(/^cyanidex[._-]?/i, '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Demo Operator';
}

function readSessionCache() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

export function restoreDemoSession() {
  const cached = readSessionCache();
  if (!cached || cached.mode !== 'demo') return null;
  if (cached.expires_at && Date.now() >= cached.expires_at * 1000) {
    clearSessionCache();
    return null;
  }

  const profile = {
    email: cached.email,
    name: cached.name || demoNameFromEmail(cached.email),
    role: cached.role || 'Viewer',
  };
  return {
    session: {
      access_token: cached.access_token,
      expires_at: cached.expires_at,
    },
    user: {
      id: cached.id,
      email: cached.email,
      user_metadata: {
        full_name: profile.name,
        role: profile.role,
      },
    },
    profile,
  };
}

export function createDemoSession({ email, name = '', role = '' }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const profile = {
    email: cleanEmail,
    name: name || demoNameFromEmail(cleanEmail),
    role: role || demoRoleFromEmail(cleanEmail),
  };
  const expires_at = Math.floor(Date.now() / 1000) + DEMO_TTL_SECONDS;
  const id = `demo-${cleanEmail.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'operator'}`;
  const access_token = `demo-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
  saveSession({ id, ...profile, access_token, expires_at, mode: 'demo' });
  return restoreDemoSession();
}

export async function loadProfile(supabase, userId, fallbackEmail, authUser = null) {
  const { data, error } = await supabase
    .from('users')
    .select('role, full_name, email')
    .eq('id', userId)
    .maybeSingle();

  if (!error && data) {
    return {
      email: data.email || fallbackEmail,
      name: data.full_name || fallbackEmail.split('@')[0],
      role: data.role || 'Viewer',
    };
  }

  // Profile row missing — try to provision via API, then fall back to auth metadata
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (session?.access_token) {
      const ensured = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      }).then((r) => r.json());
      if (ensured?.profile) return ensured.profile;
    }
  } catch { /* continue to metadata fallback */ }

  if (authUser) {
    return {
      email: authUser.email || fallbackEmail,
      name: authUser.user_metadata?.full_name || fallbackEmail.split('@')[0],
      role: authUser.user_metadata?.role || 'Viewer',
    };
  }

  throw new Error(error?.message || 'Could not load operator profile.');
}

export function saveSession({ id, email, name, role, access_token, expires_at = null, mode = 'supabase' }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id, email, name, role, access_token, expires_at, mode,
    issued_at: new Date().toISOString(),
  }));
}

export function clearSessionCache() {
  localStorage.removeItem(SESSION_KEY);
}

export async function logout() {
  try {
    const supabase = await getSupabase();
    if (supabase) await supabase.auth.signOut({ scope: 'global' });
  } catch {
    try {
      const supabase = await getSupabase();
      if (supabase) await supabase.auth.signOut();
    } catch { /* session cleared locally regardless */ }
  }
  clearSessionCache();
  sessionStorage.removeItem('cyanidex.auth.notice');
  window.location.href = 'index.html';
}

export function enterApp(fromEl) {
  const go = () => { window.location.href = 'app.html#/command-center'; };
  if (fromEl) {
    fromEl.style.transition = 'all .5s var(--ease)';
    fromEl.style.transform = 'scale(1.04)';
    fromEl.style.opacity = '0';
    setTimeout(go, 460);
  } else go();
}
