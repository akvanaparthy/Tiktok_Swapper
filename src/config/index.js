import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let config = {
  airtable: {},
  apiKeys: {},
  processing: {
    batchSize: 100,
    maxRetries: 3,
    retryBackoff: [1000, 2000, 4000],
    concurrency: 2
  },
  circuitBreaker: {
    failureThreshold: 5,
    cooldownMs: 60000
  }
};

// Load from apis.json (backward compatibility)
try {
  const apisPath = join(__dirname, '../../apis.json');
  const apisFile = readFileSync(apisPath, 'utf-8');
  const apis = JSON.parse(apisFile);
  config.airtable = apis.airtable || {};
  config.apiKeys = apis.apiKeys || {};
} catch (error) {
  console.error('Failed to load apis.json:', error.message);
  process.exit(1);
}

// Override with environment variables if present
if (process.env.AIRTABLE_TOKEN) config.airtable.token = process.env.AIRTABLE_TOKEN;
if (process.env.AIRTABLE_BASE_ID) config.airtable.baseId = process.env.AIRTABLE_BASE_ID;
if (process.env.APIFY_TOKEN) config.apiKeys.apify = process.env.APIFY_TOKEN;
if (process.env.FAL_API_KEY) config.apiKeys.fal = process.env.FAL_API_KEY;
if (process.env.WAVESPEED_API_KEY) config.apiKeys.wavespeed = process.env.WAVESPEED_API_KEY;

// Validate required configuration
function validateConfig() {
  const errors = [];
  if (!config.airtable?.token) errors.push('Airtable token is missing');
  if (!config.airtable?.baseId) errors.push('Airtable base ID is missing');
  if (!config.apiKeys?.apify) errors.push('Apify API token is missing');

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error('  ' + err));
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

export default config;
