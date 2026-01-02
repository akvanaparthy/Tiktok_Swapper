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
    fal: {
      image: loadMultipleKeys('FAL_IMAGE_API_KEY'),
      video: loadMultipleKeys('FAL_VIDEO_API_KEY')
    },
    wavespeed: {
      image: loadMultipleKeys('WAVESPEED_IMAGE_API_KEY'),
      video: loadMultipleKeys('WAVESPEED_VIDEO_API_KEY')
    }
  },
  apiRotation: {
    fal: {
      image: {
        requestsPerKey: parseInt(process.env.FAL_IMAGE_REQUESTS_PER_KEY || '1'),
        currentIndex: 0,
        currentCount: 0
      },
      video: {
        requestsPerKey: parseInt(process.env.FAL_VIDEO_REQUESTS_PER_KEY || '1'),
        currentIndex: 0,
        currentCount: 0
      }
    },
    wavespeed: {
      image: {
        requestsPerKey: parseInt(process.env.WAVESPEED_IMAGE_REQUESTS_PER_KEY || '1'),
        currentIndex: 0,
        currentCount: 0
      },
      video: {
        requestsPerKey: parseInt(process.env.WAVESPEED_VIDEO_REQUESTS_PER_KEY || '1'),
        currentIndex: 0,
        currentCount: 0
      }
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
  const hasFalImage = config.apiKeys.fal.image.length > 0;
  const hasFalVideo = config.apiKeys.fal.video.length > 0;
  const hasWavespeedImage = config.apiKeys.wavespeed.image.length > 0;
  const hasWavespeedVideo = config.apiKeys.wavespeed.video.length > 0;

  const hasFal = hasFalImage && hasFalVideo;
  const hasWavespeed = hasWavespeedImage && hasWavespeedVideo;

  if (!hasFal && !hasWavespeed) {
    errors.push('At least one complete API provider is required');
    if (!hasFalImage) errors.push('FAL_IMAGE_API_KEY_1 is missing');
    if (!hasFalVideo) errors.push('FAL_VIDEO_API_KEY_1 is missing');
    if (!hasWavespeedImage) errors.push('WAVESPEED_IMAGE_API_KEY_1 is missing');
    if (!hasWavespeedVideo) errors.push('WAVESPEED_VIDEO_API_KEY_1 is missing');
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
console.log(`Loaded ${config.apiKeys.fal.image.length} FAL.ai IMAGE API key(s)`);
console.log(`Loaded ${config.apiKeys.fal.video.length} FAL.ai VIDEO API key(s)`);
console.log(`Loaded ${config.apiKeys.wavespeed.image.length} Wavespeed IMAGE API key(s)`);
console.log(`Loaded ${config.apiKeys.wavespeed.video.length} Wavespeed VIDEO API key(s)`);

export default config;
