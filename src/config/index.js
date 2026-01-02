import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to load multiple API keys
function loadMultipleKeys(prefix) {
  const keys = [];
  let index = 1;
  while (process.env[`${prefix}_${index}`]) {
    keys.push(process.env[`${prefix}_${index}`]);
    index++;
  }
  // Fallback to single key without number suffix
  if (keys.length === 0 && process.env[prefix]) {
    keys.push(process.env[prefix]);
  }
  return keys;
}

const config = {
  airtable: {
    token: process.env.AIRTABLE_TOKEN || '',
    baseId: process.env.AIRTABLE_BASE_ID || ''
  },
  apiKeys: {
    apify: process.env.APIFY_TOKEN || '',
    fal: loadMultipleKeys('FAL_API_KEY'),
    wavespeed: loadMultipleKeys('WAVESPEED_API_KEY')
  },
  apiRotation: {
    fal: {
      requestsPerKey: parseInt(process.env.FAL_REQUESTS_PER_KEY || '1'),
      currentIndex: 0,
      currentCount: 0
    },
    wavespeed: {
      requestsPerKey: parseInt(process.env.WAVESPEED_REQUESTS_PER_KEY || '1'),
      currentIndex: 0,
      currentCount: 0
    }
  },
  processing: {
    batchSize: 100,
    maxRetries: 3,
    retryBackoff: [1000, 2000, 4000],
    concurrency: parseInt(process.env.CONCURRENCY || '2')
  },
  circuitBreaker: {
    failureThreshold: 5,
    cooldownMs: 60000
  }
};

// Validate required configuration
function validateConfig() {
  const errors = [];
  if (!config.airtable?.token) errors.push('AIRTABLE_TOKEN is missing');
  if (!config.airtable?.baseId) errors.push('AIRTABLE_BASE_ID is missing');
  if (!config.apiKeys?.apify) errors.push('APIFY_TOKEN is missing');

  // Check if at least one provider has API keys
  const hasFal = config.apiKeys.fal.length > 0;
  const hasWavespeed = config.apiKeys.wavespeed.length > 0;

  if (!hasFal && !hasWavespeed) {
    errors.push('At least one API provider is required (FAL_API_KEY_1 or WAVESPEED_API_KEY_1)');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error('  ' + err));
    console.error('\nPlease set environment variables in .env file');
    console.error('Copy .env.example to .env and fill in your credentials');
    process.exit(1);
  }
}

validateConfig();

// Check Node.js version
const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
if (nodeVersion < 18) {
  console.error(`Node.js 18+ required! Current: ${process.version}`);
  process.exit(1);
}

// Log loaded API keys count
console.log(`Loaded ${config.apiKeys.fal.length} FAL.ai API key(s)`);
console.log(`Loaded ${config.apiKeys.wavespeed.length} Wavespeed API key(s)`);

export default config;
