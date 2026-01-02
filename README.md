# TikTok Swapper v2.0

AI-powered character replacement for TikTok and Instagram videos.

## Features

- **Modular Architecture**: Clean separation of concerns with providers, services, and utilities
- **Persistent Job Queue**: SQLite-based queue with automatic retry and resume support
- **Professional Logging**: Winston-based logging to file and console
- **Multiple Providers**: Support for FAL.ai and Wavespeed APIs
- **Circuit Breaker**: Automatic failure detection and cooldown
- **Concurrent Processing**: Configurable concurrency limits

## Project Structure

```
tiktok-swapper/
├── src/
│   ├── config/              # Configuration management
│   ├── providers/
│   │   ├── image/           # Image generation providers
│   │   ├── video/           # Video generation providers
│   │   └── scraper/         # TikTok/Instagram scrapers
│   ├── services/
│   │   ├── airtable.js      # Airtable operations
│   │   ├── queue.js         # Job queue with SQLite
│   │   └── processor.js     # Main processing logic
│   ├── utils/               # Utilities (logging, rate limiting, etc.)
│   └── index.js             # Main entry point
├── logs/                    # Log files
├── config/
│   └── apis.json            # API credentials (or use .env)
├── queue.db                 # SQLite job queue database
└── package.json
```

## Setup

1. **Configure credentials:**
   - Copy `.env.example` to `.env`
   - Fill in your API credentials
   - **Multiple API Keys Supported!** Add FAL_API_KEY_1, FAL_API_KEY_2, etc. for automatic rotation

2. **Configure Airtable:**
   - Create a `Configuration` table with fields:
     - API_Provider (FAL.ai or Wavespeed)
     - Image_Model (Seedream 4.0, Seedream 4.5, Nanobanana Pro)
     - num_images
     - Video_Resolution
     - Enable_NSFW
   - Create a `Generation` table with your video processing jobs

## Usage

**Simple way (Windows):**
```bash
# Just double-click run.bat (same as before!)
run.bat
```

Dependencies are auto-installed on first run.

**Alternative (all platforms):**
```bash
# Manual install dependencies (only needed once)
npm install

# Run the processor
npm start

# Development mode with auto-reload
npm run dev
```

## Configuration

### Environment Variables

**Required:**
- `AIRTABLE_TOKEN`: Your Airtable API token
- `AIRTABLE_BASE_ID`: Your Airtable base ID
- `APIFY_TOKEN`: Your Apify API token (for video scraping)

**API Keys (add multiple for automatic rotation):**
- `FAL_API_KEY_1`, `FAL_API_KEY_2`, `FAL_API_KEY_3`, ... (FAL.ai keys)
- `WAVESPEED_API_KEY_1`, `WAVESPEED_API_KEY_2`, ... (Wavespeed keys)

**API Rotation Settings:**
- `FAL_REQUESTS_PER_KEY`: How many requests each FAL key handles before rotating (default: 1)
- `WAVESPEED_REQUESTS_PER_KEY`: How many requests each Wavespeed key handles before rotating (default: 1)
- Set to `0` or `1` for round-robin (alternates every request)
- Set to higher number (e.g., `10`) to use each key 10 times before rotating

**Optional:**
- `LOG_LEVEL`: Logging level (debug, info, warn, error) - default: info
- `CONCURRENCY`: Max concurrent jobs (default: 2)

### Processing Options

Edit `src/config/index.js` to adjust:
- `processing.maxRetries`: Max retry attempts (default: 3)
- `circuitBreaker.failureThreshold`: Failures before circuit opens (default: 5)
- `circuitBreaker.cooldownMs`: Cooldown period in ms (default: 60000)

## API Rotation (Multiple API Keys)

**Why use multiple API keys?**
- Bypass rate limits by distributing requests across multiple keys
- Increase throughput and reliability
- Automatic failover if one key has issues

**How it works:**
1. Add multiple keys: `FAL_API_KEY_1=key1`, `FAL_API_KEY_2=key2`, etc.
2. System automatically rotates between keys
3. State persisted in database - resumes correctly after restart
4. Separate rotation for image gen and video gen

**Example `.env` for 3 FAL keys:**
```bash
FAL_API_KEY_1=fal_key_abc123
FAL_API_KEY_2=fal_key_def456
FAL_API_KEY_3=fal_key_ghi789
FAL_REQUESTS_PER_KEY=5  # Use each key 5 times before rotating
```

Result: Key 1 → 5 requests → Key 2 → 5 requests → Key 3 → 5 requests → Key 1 (loop)

## Job Queue

The system uses a persistent SQLite queue:

- **Resume Support**: Crashes won't lose progress - jobs resume on restart
- **Retry Logic**: Failed jobs automatically retry with exponential backoff
- **Status Tracking**: Jobs tracked as pending, processing, completed, or failed
- **Auto Cleanup**: Completed jobs older than 7 days are auto-removed

## Logs

Logs are written to:
- `logs/combined.log`: All logs
- `logs/error.log`: Error logs only
- Console: Colored output for development

## Migration from v1.x

**v2.0 now uses `.env` files instead of `apis.json`:**

1. Copy `.env.example` to `.env`
2. Transfer your credentials from old `apis.json` to `.env`
3. **Bonus:** Add multiple API keys for automatic rotation!

## Troubleshooting

**Check job queue status:**
```javascript
import JobQueue from './src/services/queue.js';
const queue = new JobQueue();
console.log(queue.getStats());
```

**View logs:**
```bash
tail -f logs/combined.log
```

**Reset failed jobs:**
Delete `queue.db` and restart - jobs will be re-queued from Airtable.
