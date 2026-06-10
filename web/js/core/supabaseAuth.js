import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

let _client = null;

export async function getSupabase() {
  if (_client) return _client;
  const cfg = await fetch('/api/config/public').then((r) => r.json());
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

export function saveSession({ id, email, name, role, access_token }) {
  localStorage.setItem('cyanidex.session', JSON.stringify({
    id, email, name, role, access_token,
    issued_at: new Date().toISOString(),
  }));
}

export function clearSessionCache() {
  localStorage.removeItem('cyanidex.session');
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
