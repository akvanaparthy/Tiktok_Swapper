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
   - Use `config-gui.html` to configure your API keys (same as before)
   - Or manually edit `apis.json`
   - Or use `.env` file (copy from `.env.example`)

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

- `LOG_LEVEL`: Logging level (debug, info, warn, error) - default: info
- `AIRTABLE_TOKEN`: Airtable API token
- `AIRTABLE_BASE_ID`: Airtable base ID
- `APIFY_TOKEN`: Apify API token
- `FAL_API_KEY`: FAL.ai API key
- `WAVESPEED_API_KEY`: Wavespeed API key

### Processing Options

Edit `src/config/index.js` to adjust:
- `processing.concurrency`: Max concurrent jobs (default: 2)
- `processing.maxRetries`: Max retry attempts (default: 3)
- `circuitBreaker.failureThreshold`: Failures before circuit opens (default: 5)
- `circuitBreaker.cooldownMs`: Cooldown period in ms (default: 60000)

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

## Migration from v1.0

Your existing `apis.json` and `config-gui.html` continue to work. The new modular architecture is fully backward compatible.

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
