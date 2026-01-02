#!/usr/bin/env node

import { Processor } from './services/processor.js';
import logger from './utils/logger.js';

async function main() {
  const processor = new Processor();

  try {
    await processor.run();
  } catch (error) {
    logger.error('Fatal error', { error: error.message, stack: error.stack });
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    processor.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

main();
