export function arrayToBase64(bytes) {
  const CHUNK = 0x8000;
  let str = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, i + CHUNK);
    str += String.fromCharCode.apply(null, chunk);
  }
  return btoa(str);
}

export async function urlToDataUri(url, httpsAgent) {
  if (url.startsWith('data:')) return url;

  const response = await fetch(url, { agent: httpsAgent });
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const base64 = arrayToBase64(bytes);

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${base64}`;
}

export function detectPlatform(url) {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  return null;
}
