import { sleep } from '../../utils/concurrency.js';
import logger from '../../utils/logger.js';

export class FalWan {
  constructor(apiKey, httpsAgent) {
    this.apiKey = apiKey;
    this.httpsAgent = httpsAgent;
  }

  getName() {
    return 'FAL.ai WAN 2.2 Animate';
  }

  async generate(config) {
    const { videoUrl, imageUrl, resolution } = config;

    logger.info('Generating video with FAL WAN Animate', { resolution });

    const requestBody = {
      video_url: videoUrl,
      image_url: imageUrl,
      resolution: resolution || '480p',
      guidance_scale: 1,
      num_inference_steps: 20,
      enable_safety_checker: false
    };

    // Submit job
    const submitResponse = await fetch(
      'https://queue.fal.run/fal-ai/wan/v2.2-14b/animate/replace',
      {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        agent: this.httpsAgent,
        signal: AbortSignal.timeout(60000)
      }
    );

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`FAL submit error ${submitResponse.status}: ${errorText.substring(0, 200)}`);
    }

    const submitResult = await submitResponse.json();
    const requestId = submitResult.request_id;

    if (!requestId) {
      throw new Error('FAL did not return request_id');
    }

    logger.info('Video generation job submitted', { requestId });

    // Poll for result
    const pollIntervals = [5000, 10000, 15000, 20000, 30000];
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pollInterval = pollIntervals[Math.min(attempt, pollIntervals.length - 1)];
      await sleep(pollInterval);

      let statusResponse;
      try {
        statusResponse = await fetch(
          `https://queue.fal.run/fal-ai/wan/requests/${requestId}/status`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Key ${this.apiKey}`
            },
            agent: this.httpsAgent,
            signal: AbortSignal.timeout(30000)
          }
        );
      } catch (fetchError) {
        continue;
      }

      if (!statusResponse.ok) {
        continue;
      }

      const status = await statusResponse.json();

      if (status.status === 'COMPLETED') {
        const resultResponse = await fetch(
          `https://queue.fal.run/fal-ai/wan/requests/${requestId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Key ${this.apiKey}`
            },
            agent: this.httpsAgent
          }
        );

        if (!resultResponse.ok) {
          const errorText = await resultResponse.text();
          throw new Error(`Failed to get result: ${resultResponse.status} - ${errorText.substring(0, 200)}`);
        }

        const result = await resultResponse.json();
        const videoResultUrl = result.video?.url;

        if (!videoResultUrl) {
          throw new Error('FAL returned no video URL in result');
        }

        logger.info('Video generated successfully');
        return { url: videoResultUrl };
      } else if (status.status === 'FAILED') {
        throw new Error(`FAL job failed: ${status.error || 'Unknown error'}`);
      }
    }

    throw new Error('FAL job timed out');
  }
}
