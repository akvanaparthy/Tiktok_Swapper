import logger from '../../utils/logger.js';

export class WavespeedNanobanana {
  constructor(getApiKey, httpsAgent) {
    this.getApiKey = getApiKey;
    this.httpsAgent = httpsAgent;
  }

  getName() {
    return 'Wavespeed Nanobanana Pro';
  }

  async generate(config) {
    const { prompt, refImageUrls, numImages, size } = config;
    const httpUrls = refImageUrls.filter(url => !url.startsWith('data:'));

    if (httpUrls.length === 0) {
      throw new Error('Wavespeed requires HTTP URLs');
    }

    const apiKey = typeof this.getApiKey === 'function' ? this.getApiKey() : this.getApiKey;

    logger.info('Generating images with Wavespeed Nanobanana Pro', { numImages, size });

    // Calculate aspect ratio
    const [width, height] = size.split('x').map(Number);
    const ratio = width / height;
    let aspectRatio = '1:1';
    if (ratio > 1.7) aspectRatio = '16:9';
    else if (ratio > 1.4) aspectRatio = '3:2';
    else if (ratio > 1.2) aspectRatio = '4:3';
    else if (ratio < 0.6) aspectRatio = '9:16';
    else if (ratio < 0.75) aspectRatio = '2:3';
    else if (ratio < 0.85) aspectRatio = '3:4';

    const requestBody = {
      prompt: prompt,
      images: httpUrls,
      aspect_ratio: aspectRatio,
      resolution: '2k',
      enable_sync_mode: true
    };

    const response = await fetch(
      'https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        agent: this.httpsAgent,
        signal: AbortSignal.timeout(300000)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wavespeed API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();

    if (result.code !== 200) {
      throw new Error(`Wavespeed error: ${result.message || 'Unknown error'}`);
    }

    const outputs = result.data?.outputs || [];

    if (outputs.length === 0) {
      throw new Error('Wavespeed returned no images');
    }

    logger.info('Images generated successfully', { count: outputs.length });
    return outputs.map(url => ({ url }));
  }
}
