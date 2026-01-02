import https from 'https';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ConcurrencyLimiter, CircuitBreaker } from '../utils/concurrency.js';
import { detectPlatform, urlToDataUri } from '../utils/image.js';
import { fetchAirtableRecords, updateAirtableRecord } from './airtable.js';
import { fetchTikTokVideo } from '../providers/scraper/tiktok.js';
import { fetchInstagramReel } from '../providers/scraper/instagram.js';
import { createImageProvider, createVideoProvider } from '../providers/factory.js';
import JobQueue from './queue.js';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 300000,
  keepAliveMsecs: 30000
});

export class Processor {
  constructor() {
    this.queue = new JobQueue();
    this.concurrencyLimiter = new ConcurrencyLimiter(config.processing.concurrency);
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreaker.failureThreshold,
      config.circuitBreaker.cooldownMs
    );
    this.stats = {
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      startTime: Date.now()
    };
  }

  async loadConfiguration() {
    logger.info('Loading configuration from Airtable');

    const configRecords = await fetchAirtableRecords('Configuration', '', [], httpsAgent);

    if (configRecords.length === 0) {
      throw new Error('No configuration found in Airtable Configuration table');
    }

    const configFields = configRecords[0].fields;

    const apiProvider = configFields.API_Provider || 'FAL.ai';
    const imageModel = configFields.Image_Model || 'Seedream 4.5';
    const numImages = configFields.num_images || 4;
    const videoResolution = configFields.Video_Resolution || '480p';
    const enableNSFW = configFields.Enable_NSFW || false;

    const falApiKey = config.apiKeys.fal || '';
    const wavespeedApiKey = config.apiKeys.wavespeed || '';

    // Validate API keys
    if (apiProvider === 'FAL.ai' && !falApiKey) {
      throw new Error('FAL.ai API key is missing');
    }
    if (apiProvider === 'Wavespeed' && !wavespeedApiKey) {
      throw new Error('Wavespeed API key is missing');
    }

    const apiKey = apiProvider === 'FAL.ai' ? falApiKey : wavespeedApiKey;

    const imageAPI = createImageProvider(apiProvider, imageModel, apiKey, httpsAgent);
    const videoAPI = createVideoProvider(apiProvider, apiKey, httpsAgent);

    logger.info('Configuration loaded', {
      apiProvider,
      imageModel,
      imageAPI: imageAPI.getName(),
      videoAPI: videoAPI.getName(),
      numImages,
      videoResolution
    });

    return {
      apiProvider,
      imageModel,
      numImages,
      videoResolution,
      enableNSFW,
      imageAPI,
      videoAPI
    };
  }

  async loadRecords() {
    logger.info('Loading records from Airtable');

    let records;
    try {
      const filterWithStatus = 'AND(OR({Link} != "", {Source_Video} != ""), {AI_Character} != "", {Output_Video} = "", {Status} != "Processing")';
      records = await fetchAirtableRecords('Generation', filterWithStatus, [], httpsAgent);
    } catch (error) {
      if (error.message.includes('Unknown field names') || error.message.includes('status')) {
        const filterBasic = 'AND(OR({Link} != "", {Source_Video} != ""), {AI_Character} != "", {Output_Video} = "")';
        records = await fetchAirtableRecords('Generation', filterBasic, [], httpsAgent);
      } else {
        throw error;
      }
    }

    logger.info('Records loaded', { count: records.length });
    return records;
  }

  async enqueueRecords(records) {
    for (const record of records) {
      this.queue.enqueue(record.id, {
        id: record.id,
        fields: record.fields
      });
    }
    this.stats.total = records.length;
    logger.info('Records enqueued', { count: records.length });
  }

  async processJob(job, processingConfig) {
    const { id: recordId, fields } = job.data;

    try {
      if (!this.circuitBreaker.canProceed()) {
        logger.warn('Circuit breaker open, skipping job', { recordId });
        return;
      }

      logger.info('Processing job', { recordId });

      // Mark as Processing
      try {
        await updateAirtableRecord('Generation', recordId, { 'Status': 'Processing' }, httpsAgent);
      } catch (statusError) {
        // Status field may not exist
      }

      const link = fields.Link || '';
      const sourceVideoAttachments = fields.Source_Video || [];
      const aiCharacterAttachments = fields.AI_Character || [];
      const existingCover = fields.Cover_Image || [];
      const existingGeneratedImages = fields.Generated_Images || [];

      if (aiCharacterAttachments.length === 0) {
        throw new Error('AI_Character is required');
      }

      const aiCharacterUrl = aiCharacterAttachments[0].url;
      let videoUrl = null;
      let coverUrl = null;
      let imageWidth = 720;
      let imageHeight = 1280;

      // Get video URL and cover
      if (sourceVideoAttachments.length > 0) {
        videoUrl = sourceVideoAttachments[0].url;
        if (existingCover.length > 0) {
          coverUrl = existingCover[0].url;
        }
      } else if (link) {
        const platform = detectPlatform(link);

        if (!platform) {
          throw new Error('Unsupported platform. Only TikTok and Instagram are supported.');
        }

        let result;
        if (platform === 'tiktok') {
          result = await fetchTikTokVideo(link, config.apiKeys.apify, httpsAgent);
        } else {
          result = await fetchInstagramReel(link, config.apiKeys.apify, httpsAgent);
        }

        videoUrl = result.videoUrl;
        coverUrl = result.coverUrl;
        imageWidth = result.width;
        imageHeight = result.height;

        // Save video URL and cover to Airtable
        const updateFields = {
          'Source_Video': [{ url: videoUrl }]
        };
        if (coverUrl) {
          updateFields['Cover_Image'] = [{ url: coverUrl }];
        }
        await updateAirtableRecord('Generation', recordId, updateFields, httpsAgent);
      } else {
        throw new Error('No Link or Source_Video provided');
      }

      if (!coverUrl && existingCover.length === 0) {
        throw new Error('No cover image available. Please upload a video with a cover or use a TikTok/Instagram link.');
      }

      if (!coverUrl && existingCover.length > 0) {
        coverUrl = existingCover[0].url;
      }

      // Generate new images with AI character
      let generatedImages;

      if (existingGeneratedImages.length > 0) {
        generatedImages = existingGeneratedImages;
      } else {
        // Prepare reference images
        let refImageUrls;

        if (processingConfig.apiProvider === 'FAL.ai') {
          const coverDataUri = await urlToDataUri(coverUrl, httpsAgent);
          const aiCharacterDataUri = await urlToDataUri(aiCharacterUrl, httpsAgent);
          refImageUrls = [coverDataUri, aiCharacterDataUri];
        } else {
          refImageUrls = [coverUrl, aiCharacterUrl];
        }

        const prompt = 'Replace the person on the first image by the person from the second image. Keep the exact same pose, clothing style, and background. The result should look like the person from the second image is in the scene from the first image.';
        const imageSize = `${imageWidth}x${imageHeight}`;

        const images = await processingConfig.imageAPI.generate({
          prompt,
          refImageUrls,
          numImages: processingConfig.numImages,
          enableNSFW: processingConfig.enableNSFW,
          size: imageSize
        });

        // Save to Airtable
        const imageAttachments = images.map(img => ({ url: img.url }));
        await updateAirtableRecord('Generation', recordId, {
          'Generated_Images': imageAttachments
        }, httpsAgent);

        generatedImages = imageAttachments;
      }

      // Generate video with WAN Animate
      const selectedImageUrl = generatedImages[0].url;

      const videoResult = await processingConfig.videoAPI.generate({
        videoUrl: videoUrl,
        imageUrl: selectedImageUrl,
        resolution: processingConfig.videoResolution
      });

      // Save output video to Airtable
      await updateAirtableRecord('Generation', recordId, {
        'Output_Video': [{ url: videoResult.url }],
        'Error_Message': ''
      }, httpsAgent);

      // Update Status
      try {
        await updateAirtableRecord('Generation', recordId, { 'Status': 'Complete' }, httpsAgent);
      } catch {}

      logger.info('Job completed successfully', { recordId });
      this.circuitBreaker.recordSuccess();
      this.stats.success++;
      this.queue.complete(recordId);

    } catch (error) {
      logger.error('Job failed', { recordId, error: error.message, stack: error.stack });
      this.circuitBreaker.recordFailure();
      this.stats.failed++;

      // Save error to Airtable
      try {
        await updateAirtableRecord('Generation', recordId, {
          'Error_Message': error.message.substring(0, 500)
        }, httpsAgent);
      } catch {}

      // Update Status
      try {
        await updateAirtableRecord('Generation', recordId, { 'Status': 'Error' }, httpsAgent);
      } catch {}

      this.queue.fail(recordId, error.message, config.processing.maxRetries);
    } finally {
      this.stats.processed++;
    }
  }

  async run() {
    logger.info('Processor starting...');

    const processingConfig = await this.loadConfiguration();
    const records = await this.loadRecords();

    if (records.length === 0) {
      logger.info('No records to process');
      return;
    }

    await this.enqueueRecords(records);

    logger.info('Processing started', { total: this.stats.total });

    // Process jobs concurrently
    const tasks = [];

    while (true) {
      const job = this.queue.dequeue();
      if (!job) break;

      const task = this.concurrencyLimiter.run(async () => {
        await this.processJob(job, processingConfig);
      });

      tasks.push(task);
    }

    await Promise.all(tasks);

    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    logger.info('Processing complete', {
      total: this.stats.processed,
      success: this.stats.success,
      failed: this.stats.failed,
      time: `${Math.round(elapsed)}s`
    });

    console.log(`\nComplete: ${this.stats.processed} total | ${this.stats.success} success | ${this.stats.failed} failed | ${Math.round(elapsed)}s`);
  }

  cleanup() {
    this.queue.cleanup();
    this.queue.close();
  }
}
