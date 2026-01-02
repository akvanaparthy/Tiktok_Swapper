import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../queue.db');

class ApiRotationManager {
  constructor() {
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    // Create rotation state table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_rotation (
        provider TEXT PRIMARY KEY,
        current_index INTEGER NOT NULL DEFAULT 0,
        current_count INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );
    `);
    logger.debug('API rotation manager initialized');
  }

  getNextKey(provider, apiKeys, requestsPerKey) {
    if (!apiKeys || apiKeys.length === 0) {
      throw new Error(`No API keys available for provider: ${provider}`);
    }

    // If only one key, always return it
    if (apiKeys.length === 1) {
      return apiKeys[0];
    }

    // Get or create rotation state
    let state = this.db.prepare('SELECT * FROM api_rotation WHERE provider = ?').get(provider);

    if (!state) {
      // Initialize state for this provider
      state = {
        current_index: 0,
        current_count: 0
      };
      this.db.prepare(`
        INSERT INTO api_rotation (provider, current_index, current_count, updated_at)
        VALUES (?, 0, 0, ?)
      `).run(provider, Date.now());
    }

    let currentIndex = state.current_index;
    let currentCount = state.current_count;

    // Get the current API key
    const apiKey = apiKeys[currentIndex];

    // Increment usage count
    currentCount++;

    // Check if we need to rotate
    if (requestsPerKey > 0 && currentCount >= requestsPerKey) {
      // Move to next API key
      currentIndex = (currentIndex + 1) % apiKeys.length;
      currentCount = 0;
      logger.info(`Rotating to next API key`, { provider, index: currentIndex + 1, total: apiKeys.length });
    }

    // Update state in database
    this.db.prepare(`
      UPDATE api_rotation
      SET current_index = ?, current_count = ?, updated_at = ?
      WHERE provider = ?
    `).run(currentIndex, currentCount, Date.now(), provider);

    logger.debug(`Using API key for ${provider}`, {
      keyIndex: currentIndex + 1,
      totalKeys: apiKeys.length,
      usageCount: currentCount,
      requestsPerKey
    });

    return apiKey;
  }

  // Get rotation statistics
  getStats() {
    const stats = this.db.prepare('SELECT * FROM api_rotation').all();
    return stats.reduce((acc, stat) => {
      acc[stat.provider] = {
        currentIndex: stat.current_index + 1, // 1-indexed for display
        currentCount: stat.current_count,
        lastUpdated: new Date(stat.updated_at).toISOString()
      };
      return acc;
    }, {});
  }

  // Reset rotation state for a provider
  reset(provider) {
    this.db.prepare(`
      UPDATE api_rotation
      SET current_index = 0, current_count = 0, updated_at = ?
      WHERE provider = ?
    `).run(Date.now(), provider);
    logger.info(`Reset API rotation for ${provider}`);
  }

  // Reset all providers
  resetAll() {
    this.db.prepare('DELETE FROM api_rotation').run();
    logger.info('Reset all API rotations');
  }

  close() {
    // Don't close the db here since it's shared with JobQueue
  }
}

export default ApiRotationManager;
