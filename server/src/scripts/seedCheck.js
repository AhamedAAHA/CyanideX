import { integrationStatus } from '../config/env.js';
import { pipeline } from '../services/forecasting.service.js';

/**
 * Diagnostic / seed-check utility.
 * Prints integration status and generates one intelligence snapshot
 * so you can confirm the pipeline produces data end-to-end.
 */
const run = async () => {
  console.log('Integration status:', integrationStatus());
  const snap = await pipeline.getSnapshot({ force: true });
  console.log('Snapshot generated at:', snap.generated_at);
  console.log('Collection source   :', snap.collection_source);
  console.log('Signals             :', snap.signals.length);
  console.log('Forecasts           :', snap.analyses.length);
  console.log('Global posture      :', snap.stats.global_posture);
  console.log('Top signal          :', snap.signals[0]?.headline);
  process.exit(0);
};

run();
