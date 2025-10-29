import type { BuilderContent } from '@builder.io/sdk';

const apiKey = 'YJIGb4i01jvw0SRdL5Bt';
const CONTENT_ENDPOINT = 'https://cdn.builder.io/api/v3/content/content-page';

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }
  if (path === '/') {
    return '/';
  }
  return path.replace(/\/+$/, '') || '/';
}

async function fetchContentFromCdn(urlPath: string): Promise<BuilderContent | null> {
  const normalized = normalizePath(urlPath);
  const query = new URLSearchParams({
    apiKey,
    url: normalized,
    includeRefs: 'true',
    cachebust: 'false',
  });

  const response = await fetch(`${CONTENT_ENDPOINT}?${query.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    results?: BuilderContent[];
  };

  const content = json?.results?.[0];
  return content ?? null;
}

export async function getVibeAnyContent(urlPath: string): Promise<BuilderContent | null> {
  try {
    return await fetchContentFromCdn(urlPath);
  } catch (error) {
    console.warn('Failed to fetch Builder content from CDN', error);
    return null;
  }
}
