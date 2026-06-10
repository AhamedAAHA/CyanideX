import app from './app.js';
import { env, integrationStatus } from './config/env.js';

/** Local development entry — Vercel uses api/index.js instead. */
app.listen(env.port, () => {
  const s = integrationStatus();
  /* eslint-disable no-console */
  console.log('\n  ┌──────────────────────────────────────────────┐');
  console.log('  │  CYANIDEX // Threat Forecasting Intelligence OS │');
  console.log('  └──────────────────────────────────────────────┘');
  console.log(`  ▸ OS online            http://localhost:${env.port}`);
  console.log(`  ▸ Supabase             ${s.supabase ? 'connected' : 'simulated'}`);
  console.log(`  ▸ Bright Data OSINT    ${s.brightData ? 'live' : 'simulated'}`);
  console.log(`  ▸ AIML forecasting     ${s.aiml ? 'live' : 'simulated'}`);
  console.log(`  ▸ Speechmatics voice   ${s.speechmatics ? 'live' : 'client-side'}`);
  console.log('  ▸ Fallback intel       ' + (s.fallback ? 'enabled\n' : 'disabled\n'));
  /* eslint-enable no-console */
});
