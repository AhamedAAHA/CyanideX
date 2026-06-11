import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveWebRoot() {
  const candidates = [
    path.resolve(__dirname, '../../web'),
    path.join(process.cwd(), 'web'),
  ];
  return candidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) || candidates[0];
}

const webRoot = resolveWebRoot();

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// API namespace
app.use('/api', apiRouter);

// Static frontend — CORS headers required so JS modules can load images
// via canvas (land-mask sampling for the 3D globes).
app.use(express.static(webRoot, {
  setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// Explicit HTML routes (helps on serverless/CDN edge cases)
app.get('/', (_req, res) => res.sendFile(path.join(webRoot, 'index.html')));
app.get(['/app', '/app.html'], (_req, res) => res.sendFile(path.join(webRoot, 'app.html')));
app.get('/signin.html', (_req, res) => res.sendFile(path.join(webRoot, 'signin.html')));
app.get('/signup.html', (_req, res) => res.sendFile(path.join(webRoot, 'signup.html')));

export default app;
