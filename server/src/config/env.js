import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Centralised, typed access to environment configuration.
 * Any missing integration credential simply flips that
 * integration into "simulated" mode rather than crashing.
 */
const bool = (v, d = false) =>
  v === undefined ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  brightData: {
    // Accept new BRIGHT_DATA_* names, with legacy fallbacks.
    token: process.env.BRIGHT_DATA_API_KEY || process.env.BRIGHTDATA_API_TOKEN || '',
    zone: process.env.BRIGHT_DATA_SERP_ZONE || process.env.BRIGHTDATA_ZONE || '',
    baseUrl: process.env.BRIGHTDATA_BASE_URL || 'https://api.brightdata.com',
  },

  aiml: {
    apiKey: process.env.AIML_API_KEY || '',
    baseUrl: process.env.AIML_BASE_URL || 'https://api.aimlapi.com/v1',
    models: {
      analysis: process.env.AIML_MODEL_ANALYSIS || 'gpt-4o-mini',
      chat: process.env.AIML_MODEL_CHAT || 'gpt-4o',
      search: process.env.AIML_MODEL_SEARCH || 'gpt-4o-search-preview',
      searchMini: process.env.AIML_MODEL_SEARCH_MINI || 'gpt-4o-mini-search-preview',
      intent: process.env.AIML_MODEL_INTENT || 'gpt-4o-mini',
      world: process.env.AIML_MODEL_WORLD || 'gpt-4o',
      vision: process.env.AIML_MODEL_VISION || 'gpt-4o',
      transcribe: process.env.AIML_MODEL_TRANSCRIBE || 'whisper-1',
    },
    searchContextSize: process.env.AIML_SEARCH_CONTEXT_SIZE || 'medium',
    tts: {
      model: process.env.AIML_TTS_MODEL || 'openai/tts-1',
      voice: process.env.AIML_TTS_VOICE || 'nova',
      speed: Number(process.env.AIML_TTS_SPEED || 1.08),
    },
  },

  speechmatics: {
    apiKey: process.env.SPEECHMATICS_API_KEY || '',
    baseUrl: process.env.SPEECHMATICS_BASE_URL || 'https://asr.api.speechmatics.com/v2',
    ttsVoice: process.env.SPEECHMATICS_TTS_VOICE || 'sarah',
  },

  useFallback: bool(process.env.USE_FALLBACK_DATA, true),
};

export const integrationStatus = () => ({
  supabase: Boolean(env.supabase.url && env.supabase.anonKey),
  brightData: Boolean(env.brightData.token),
  aiml: Boolean(env.aiml.apiKey),
  speechmatics: Boolean(env.speechmatics.apiKey),
  fallback: env.useFallback,
});
