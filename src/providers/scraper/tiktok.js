import { sleep } from '../../utils/concurrency.js';
import logger from '../../utils/logger.js';

export async function fetchTikTokVideo(url, apifyToken, httpsAgent) {
  logger.info('Fetching TikTok video', { url });

  const actorId = 'clockworks~tiktok-video-scraper';
  const input = {
    postURLs: [url],
    shouldDownloadVideos: true,
    shouldDownloadCovers: true
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
    throw new Error('No results from TikTok scraper');
  }

  const video = items[0];

  // Extract video URL
  let videoUrl = null;

  if (video.mediaUrls && Array.isArray(video.mediaUrls) && video.mediaUrls.length > 0) {
    videoUrl = video.mediaUrls[0];
  } else if (video.videoMeta?.downloadAddr) {
    videoUrl = video.videoMeta.downloadAddr;
  } else if (video.videoMeta?.originalDownloadAddr) {
    videoUrl = video.videoMeta.originalDownloadAddr;
  } else if (video.videoMeta?.playAddr) {
    videoUrl = video.videoMeta.playAddr;
  }

  // Extract cover URL
  const coverUrl =
    video.videoMeta?.coverUrl ||
    video.videoMeta?.originalCoverUrl ||
    video.videoMeta?.originCover ||
    video.videoMeta?.dynamicCover ||
    video.coverUrl ||
    video.authorMeta?.avatar;

  if (!videoUrl) {
    throw new Error('No video URL in TikTok response - video may be private or unavailable');
  }

  const width = video.videoMeta?.width || 720;
  const height = video.videoMeta?.height || 1280;

  logger.info('TikTok video fetched successfully', { width, height });

  return { videoUrl, coverUrl, width, height };
}
