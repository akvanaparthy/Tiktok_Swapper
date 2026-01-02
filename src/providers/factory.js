import { FalSeedream40 } from './image/fal-seedream40.js';
import { FalSeedream45 } from './image/fal-seedream45.js';
import { FalNanobanana } from './image/fal-nanobanana.js';
import { WavespeedSeedream40 } from './image/wavespeed-seedream40.js';
import { WavespeedSeedream45 } from './image/wavespeed-seedream45.js';
import { WavespeedNanobanana } from './image/wavespeed-nanobanana.js';
import { FalWan } from './video/fal-wan.js';
import { WavespeedWan } from './video/wavespeed-wan.js';

export function createImageProvider(apiProvider, imageModel, apiKeys, requestsPerKey, rotationManager, httpsAgent) {
  // Create a wrapper that gets the next API key on each request
  const getApiKey = () => {
    const provider = apiProvider === 'FAL.ai' ? 'fal-image' : 'wavespeed-image';
    return rotationManager.getNextKey(provider, apiKeys, requestsPerKey);
  };

  if (apiProvider === 'FAL.ai') {
    if (imageModel === 'Seedream 4.0') {
      return new FalSeedream40(getApiKey, httpsAgent);
    } else if (imageModel === 'Seedream 4.5') {
      return new FalSeedream45(getApiKey, httpsAgent);
    } else if (imageModel === 'Nanobanana Pro') {
      return new FalNanobanana(getApiKey, httpsAgent);
    } else {
      return new FalSeedream45(getApiKey, httpsAgent);
    }
  } else {
    if (imageModel === 'Seedream 4.0') {
      return new WavespeedSeedream40(getApiKey, httpsAgent);
    } else if (imageModel === 'Seedream 4.5') {
      return new WavespeedSeedream45(getApiKey, httpsAgent);
    } else if (imageModel === 'Nanobanana Pro') {
      return new WavespeedNanobanana(getApiKey, httpsAgent);
    } else {
      return new WavespeedSeedream45(getApiKey, httpsAgent);
    }
  }
}

export function createVideoProvider(apiProvider, apiKeys, requestsPerKey, rotationManager, httpsAgent) {
  // Create a wrapper that gets the next API key on each request
  const getApiKey = () => {
    const provider = apiProvider === 'FAL.ai' ? 'fal-video' : 'wavespeed-video';
    return rotationManager.getNextKey(provider, apiKeys, requestsPerKey);
  };

  if (apiProvider === 'FAL.ai') {
    return new FalWan(getApiKey, httpsAgent);
  } else {
    return new WavespeedWan(getApiKey, httpsAgent);
  }
}
