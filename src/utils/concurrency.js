export class ConcurrencyLimiter {
  constructor(maxConcurrent) {
    this.max = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async run(fn) {
    while (this.running >= this.max) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }

  getStats() {
    return { running: this.running, queued: this.queue.length };
  }
}

export class CircuitBreaker {
  constructor(threshold = 5, cooldownMs = 60000) {
    this.failures = 0;
    this.lastFailure = null;
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  canProceed() {
    if (this.failures < this.threshold) return true;
    const timeSinceFailure = Date.now() - this.lastFailure;
    if (timeSinceFailure > this.cooldownMs) {
      this.failures = 0;
      return true;
    }
    return false;
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      console.log(`\nCircuit breaker: ${this.failures} failures, pausing for ${this.cooldownMs / 1000}s`);
    }
  }

  recordSuccess() {
    this.failures = 0;
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
