import { sleep } from '../../utils/concurrency.js';
import logger from '../../utils/logger.js';

export class WavespeedWan {
  constructor(getApiKey, httpsAgent) {
    this.getApiKey = getApiKey;
    this.httpsAgent = httpsAgent;
  }

  getName() {
    return 'Wavespeed WAN 2.2 Animate';
  }

  async generate(config) {
    const { videoUrl, imageUrl, resolution } = config;

    const apiKey = typeof this.getApiKey === 'function' ? this.getApiKey() : this.getApiKey;

    logger.info('Generating video with Wavespeed WAN Animate', { resolution });

    const requestBody = {
      image: imageUrl,
      video: videoUrl,
      mode: 'replace',
      resolution: resolution || '480p',
      seed: -1
    };

    // Submit job
    const submitResponse = await fetch(
      'https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2/animate',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        agent: this.httpsAgent,
        signal: AbortSignal.timeout(60000)
      }
    );

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Wavespeed submit error ${submitResponse.status}: ${errorText.substring(0, 200)}`);
    }

    const submitResult = await submitResponse.json();

    if (submitResult.code !== 200) {
      throw new Error(`Wavespeed error: ${submitResult.message || 'Unknown error'}`);
    }

    const requestId = submitResult.data?.id;

    if (!requestId) {
      throw new Error('Wavespeed did not return request ID');
    }

    logger.info('Video generation job submitted', { requestId });

    // Poll for result
    const pollIntervals = [5000, 10000, 15000, 20000, 30000];
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pollInterval = pollIntervals[Math.min(attempt, pollIntervals.length - 1)];
      await sleep(pollInterval);

      const statusResponse = await fetch(
        `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          agent: this.httpsAgent
        }
      );

      if (!statusResponse.ok) {
        continue;
      }

      const status = await statusResponse.json();

      if (status.data?.status === 'completed') {
        const outputs = status.data?.outputs || [];

        if (outputs.length === 0) {
          throw new Error('Wavespeed returned no video');
        }

        logger.info('Video generated successfully');
        return { url: outputs[0] };
      } else if (status.data?.status === 'failed') {
        throw new Error(`Wavespeed job failed: ${status.data?.error || 'Unknown error'}`);
      }
    }

    throw new Error('Wavespeed job timed out');
  }
}
