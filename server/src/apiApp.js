import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';

/** API-only Express app (used by Vercel serverless). */
const apiApp = express();

apiApp.use(cors());
apiApp.use(express.json({ limit: '2mb' }));
apiApp.use('/api', apiRouter);

export default apiApp;
