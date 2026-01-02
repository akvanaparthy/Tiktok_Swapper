import logger from '../../utils/logger.js';

export class WavespeedSeedream40 {
  constructor(getApiKey, httpsAgent) {
    this.getApiKey = getApiKey;
    this.httpsAgent = httpsAgent;
  }

  getName() {
    return 'Wavespeed Seedream 4.0';
  }

  async generate(config) {
    const { prompt, refImageUrls, numImages, size } = config;
    const httpUrls = refImageUrls.filter(url => !url.startsWith('data:'));

    if (httpUrls.length === 0) {
      throw new Error('Wavespeed requires HTTP URLs, no valid URLs provided');
    }

    const apiKey = typeof this.getApiKey === 'function' ? this.getApiKey() : this.getApiKey;

    logger.info('Generating images with Wavespeed Seedream 4.0', { numImages, size });

    let [width, height] = size.split('x').map(Number);
    const minPixels = 2073600;
    const currentPixels = width * height;

    if (currentPixels < minPixels) {
      const scale = Math.sqrt(minPixels / currentPixels);
      width = Math.ceil(width * scale);
      height = Math.ceil(height * scale);
      width = Math.ceil(width / 8) * 8;
      height = Math.ceil(height / 8) * 8;
    }

    const requestBody = {
      prompt: prompt,
      images: httpUrls,
      size: `${width}*${height}`,
      enable_sync_mode: true
    };

    const response = await fetch(
      'https://api.wavespeed.ai/api/v3/bytedance/seedream-v4/edit',
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

    if (result.data?.status === 'failed' || result.data?.error) {
      throw new Error(`Wavespeed error: ${result.data?.error || 'Generation failed'}`);
    }

    if (result.code !== 200) {
      throw new Error(`Wavespeed error: ${result.message || 'Unknown error'}`);
    }

    const outputs = result.data?.outputs || result.outputs || [];

    if (outputs.length === 0) {
      throw new Error('Wavespeed returned no images');
    }

    logger.info('Images generated successfully', { count: outputs.length });
    return outputs.map(url => ({ url }));
  }
}
