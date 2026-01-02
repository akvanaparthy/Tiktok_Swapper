import logger from '../../utils/logger.js';

export class FalSeedream45 {
  constructor(apiKey, httpsAgent) {
    this.apiKey = apiKey;
    this.httpsAgent = httpsAgent;
  }

  getName() {
    return 'FAL.ai Seedream 4.5';
  }

  async generate(config) {
    const { prompt, refImageUrls, numImages, enableNSFW, size } = config;
    const [width, height] = size.split('x').map(Number);

    logger.info('Generating images with FAL Seedream 4.5', { numImages, size });

    const requestBody = {
      prompt: prompt,
      image_urls: refImageUrls,
      num_images: numImages,
      image_size: { width, height },
      enable_safety_checker: !enableNSFW
    };

    const response = await fetch(
      'https://fal.run/fal-ai/bytedance/seedream/v4.5/edit',
      {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
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
