import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../queue.db');

class JobQueue {
  constructor() {
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        data TEXT NOT NULL,
        error TEXT,
        attempts INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_status ON jobs(status);
    `);
    logger.info('Job queue initialized', { dbPath });
  }

  enqueue(jobId, jobData) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO jobs (id, status, data, attempts, created_at, updated_at)
      VALUES (?, 'pending', ?, 0, ?, ?)
    `);
    stmt.run(jobId, JSON.stringify(jobData), now, now);
    logger.debug('Job enqueued', { jobId });
  }

  dequeue() {
    const job = this.db.prepare(`
      SELECT * FROM jobs
      WHERE status = 'pending'
      ORDER BY created_at
      LIMIT 1
    `).get();

    if (job) {
      this.db.prepare(`
        UPDATE jobs
        SET status = 'processing', updated_at = ?
        WHERE id = ?
      `).run(Date.now(), job.id);

      return {
        id: job.id,
        data: JSON.parse(job.data),
        attempts: job.attempts
      };
    }
    return null;
  }

  complete(jobId) {
    this.db.prepare(`
      UPDATE jobs
      SET status = 'completed', updated_at = ?
      WHERE id = ?
    `).run(Date.now(), jobId);
    logger.debug('Job completed', { jobId });
  }

  fail(jobId, error, maxRetries = 3) {
    const job = this.db.prepare('SELECT attempts FROM jobs WHERE id = ?').get(jobId);
    const newAttempts = (job?.attempts || 0) + 1;

    if (newAttempts >= maxRetries) {
      this.db.prepare(`
        UPDATE jobs
        SET status = 'failed', error = ?, attempts = ?, updated_at = ?
        WHERE id = ?
      `).run(error, newAttempts, Date.now(), jobId);
      logger.error('Job failed permanently', { jobId, attempts: newAttempts, error });
    } else {
      this.db.prepare(`
        UPDATE jobs
        SET status = 'pending', error = ?, attempts = ?, updated_at = ?
        WHERE id = ?
      `).run(error, newAttempts, Date.now(), jobId);
      logger.warn('Job failed, will retry', { jobId, attempts: newAttempts, error });
    }
  }

  getStats() {
    const stats = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
    `).all();

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    stats.forEach(stat => {
      result[stat.status] = stat.count;
    });

    return result;
  }

  cleanup(olderThanDays = 7) {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const stmt = this.db.prepare(`
      DELETE FROM jobs
      WHERE status IN ('completed', 'failed') AND updated_at < ?
    `);
    const result = stmt.run(cutoff);
    logger.info('Queue cleanup completed', { deleted: result.changes });
    return result.changes;
  }

  close() {
    this.db.close();
  }
}

export default JobQueue;
