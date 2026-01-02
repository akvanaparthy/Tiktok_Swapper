import { sleep } from '../../utils/concurrency.js';
import logger from '../../utils/logger.js';

export async function fetchInstagramReel(url, apifyToken, httpsAgent) {
  logger.info('Fetching Instagram reel', { url });

  const actorId = 'apify~instagram-api-scraper';
  const input = {
    directUrls: [url],
    resultsType: 'posts',
    resultsLimit: 1
  };

  // Start the actor run
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      agent: httpsAgent
    }
  );

  if (!runResponse.ok) {
    const error = await runResponse.text();
    throw new Error(`Apify run failed: ${error}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data.id;
  const datasetId = runData.data.defaultDatasetId;

  // Wait for completion
  let status = 'RUNNING';
  let attempts = 0;
  const maxAttempts = 60;

  while (status === 'RUNNING' || status === 'READY') {
    await sleep(3000);
    attempts++;

    if (attempts > maxAttempts) {
      throw new Error('Apify run timed out');
    }

    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
      { agent: httpsAgent }
    );

    const statusData = await statusResponse.json();
    status = statusData.data.status;
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  // Get results from dataset
  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`,
    { agent: httpsAgent }
  );

  const items = await datasetResponse.json();

  if (!items || items.length === 0) {
    throw new Error('No results from Instagram scraper');
  }

  const reel = items[0];

  // Extract video URL
  const videoUrl =
    reel.videoUrl ||
    reel.video_url ||
    reel.videoPlaybackUrl ||
    reel.video?.url ||
    reel.media?.video_versions?.[0]?.url;

  // Extract cover/thumbnail URL
  const coverUrl =
    reel.displayUrl ||
    reel.thumbnailUrl ||
    reel.thumbnail_url ||
    reel.previewUrl ||
    reel.imageUrl ||
    reel.image_versions2?.candidates?.[0]?.url;

  if (!videoUrl) {
    throw new Error('No video URL in Instagram response - may not be a video/reel');
  }

  const width = reel.dimensions?.width || reel.videoWidth || reel.width || reel.original_width || 1080;
  const height = reel.dimensions?.height || reel.videoHeight || reel.height || reel.original_height || 1920;

  logger.info('Instagram reel fetched successfully', { width, height });

  return { videoUrl, coverUrl, width, height };
}
