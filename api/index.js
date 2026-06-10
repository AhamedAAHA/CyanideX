/**
 * Vercel serverless entry — API routes only.
 * Static pages (web/) are served by @vercel/static via vercel.json routes.
 */
import apiApp from '../server/src/apiApp.js';

export default apiApp;
