/**
 * Provision CyanideX demo operators in Supabase Auth + public.users roles.
 * Run: node server/src/scripts/seedUsers.js
 */
import { env } from '../config/env.js';

const USERS = [
  {
    email: 'cyanidex.admin@gmail.com',
    password: 'Cy4n1d3X!Admin',
    full_name: 'Nova Reyes',
    role: 'Admin',
  },
  {
    email: 'cyanidex.analyst@gmail.com',
    password: 'Cy4n1d3X!Analyst',
    full_name: 'Kai Tanaka',
    role: 'Analyst',
  },
  {
    email: 'cyanidex.viewer@gmail.com',
    password: 'Cy4n1d3X!Viewer',
    full_name: 'Sam Okafor',
    role: 'Viewer',
  },
];

const base = env.supabase.url;
const key = env.supabase.serviceRoleKey;

if (!base || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function listUsers() {
  const res = await fetch(`${base}/auth/v1/admin/users?page=1&per_page=200`, { headers });
  const json = await res.json();
  return json.users || [];
}

async function createUser(u) {
  const res = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.msg || json.message || JSON.stringify(json));
  return json;
}

async function setRole(userId, role) {
  const res = await fetch(`${base}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`role update failed: ${text}`);
  }
}

const run = async () => {
  console.log('CyanideX — seeding operator accounts…\n');
  const existing = await listUsers();
  const byEmail = new Map(existing.map((u) => [u.email, u]));

  for (const u of USERS) {
    try {
      let authUser = byEmail.get(u.email);
      if (authUser) {
        console.log(`• ${u.email} already exists (${authUser.id})`);
      } else {
        authUser = await createUser(u);
        console.log(`• Created ${u.email} (${authUser.id})`);
      }
      await setRole(authUser.id, u.role);
      console.log(`  Role → ${u.role}`);
    } catch (err) {
      console.error(`✗ ${u.email}: ${err.message}`);
    }
  }

  console.log('\nLogin credentials (Supabase Auth — not real Gmail inboxes):\n');
  USERS.forEach((u) => {
    console.log(`  ${u.role.padEnd(7)}  ${u.email}`);
    console.log(`           password: ${u.password}\n`);
  });
};

run();
