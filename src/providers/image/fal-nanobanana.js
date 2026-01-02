import logger from '../../utils/logger.js';

export class FalNanobanana {
  constructor(getApiKey, httpsAgent) {
    this.getApiKey = getApiKey;
    this.httpsAgent = httpsAgent;
  }

  getName() {
    return 'FAL.ai Nanobanana Pro';
  }

  async generate(config) {
    const { prompt, refImageUrls, numImages, size } = config;

    const apiKey = typeof this.getApiKey === 'function' ? this.getApiKey() : this.getApiKey;

    logger.info('Generating images with FAL Nanobanana Pro', { numImages, size });

    // Calculate aspect ratio from size
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
      image_urls: refImageUrls,
      num_images: Math.min(numImages, 4), // Nanobanana max 4
      aspect_ratio: aspectRatio,
      resolution: '2K'
    };

    const response = await fetch(
      'https://fal.run/fal-ai/nano-banana-pro/edit',
      {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        agent: this.httpsAgent,
        signal: AbortSignal.timeout(300000)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FAL API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    const images = result.images || [];

    if (images.length === 0) {
      throw new Error('FAL returned no images');
    }

    logger.info('Images generated successfully', { count: images.length });
    return images;
  }
}
