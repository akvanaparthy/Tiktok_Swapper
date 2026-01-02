import { FalSeedream40 } from './image/fal-seedream40.js';
import { FalSeedream45 } from './image/fal-seedream45.js';
import { FalNanobanana } from './image/fal-nanobanana.js';
import { WavespeedSeedream40 } from './image/wavespeed-seedream40.js';
import { WavespeedSeedream45 } from './image/wavespeed-seedream45.js';
import { WavespeedNanobanana } from './image/wavespeed-nanobanana.js';
import { FalWan } from './video/fal-wan.js';
import { WavespeedWan } from './video/wavespeed-wan.js';

export function createImageProvider(apiProvider, imageModel, apiKey, httpsAgent) {
  if (apiProvider === 'FAL.ai') {
    if (imageModel === 'Seedream 4.0') {
      return new FalSeedream40(apiKey, httpsAgent);
    } else if (imageModel === 'Seedream 4.5') {
      return new FalSeedream45(apiKey, httpsAgent);
    } else if (imageModel === 'Nanobanana Pro') {
      return new FalNanobanana(apiKey, httpsAgent);
    } else {
      return new FalSeedream45(apiKey, httpsAgent);
    }
  } else {
    if (imageModel === 'Seedream 4.0') {
      return new WavespeedSeedream40(apiKey, httpsAgent);
    } else if (imageModel === 'Seedream 4.5') {
      return new WavespeedSeedream45(apiKey, httpsAgent);
    } else if (imageModel === 'Nanobanana Pro') {
      return new WavespeedNanobanana(apiKey, httpsAgent);
    } else {
      return new WavespeedSeedream45(apiKey, httpsAgent);
    }
  }
}

export function createVideoProvider(apiProvider, apiKey, httpsAgent) {
  if (apiProvider === 'FAL.ai') {
    return new FalWan(apiKey, httpsAgent);
  } else {
    return new WavespeedWan(apiKey, httpsAgent);
  }
}
