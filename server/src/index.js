import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, integrationStatus } from './config/env.js';
import apiRouter from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../../web');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// API namespace
app.use('/api', apiRouter);

// Static frontend (the CyanideX OS)
app.use(express.static(webRoot));

// SPA-style fallback: serve the dashboard shell for unknown non-API routes.
app.get(/^\/(?!api\/).*/, (req, res) => {
  const target = req.path === '/' ? 'index.html' : 'app.html';
  res.sendFile(path.join(webRoot, target));
});

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
