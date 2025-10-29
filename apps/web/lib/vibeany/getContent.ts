import { builder } from '@builder.io/react';
import type { BuilderContent } from '@builder.io/sdk';

const apiKey = 'YJIGb4i01jvw0SRdL5Bt';
const CONTENT_ENDPOINT = 'https://cdn.builder.io/api/v3/content/content-page';

if (!builder.apiKey) {
  builder.init(apiKey);
}

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }
  if (path === '/') {
    return '/';
  }
  return path.replace(/\/+$/, '') || '/';
}

export async function getVibeAnyContent(urlPath: string): Promise<BuilderContent | null> {
  const normalized = normalizePath(urlPath);
  const query = new URLSearchParams({
    apiKey,
    url: normalized,
    includeRefs: 'true',
    cachebust: 'false',
  });

  const response = await fetch(`${CONTENT_ENDPOINT}?${query.toString()}`);
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    results?: BuilderContent[];
  };

  const content = json?.results?.[0];
  if (content) {
    return content;
  }

  const fallback = await builder
    .get('content-page', {
      userAttributes: {
        urlPath: normalized,
      },
      cacheSeconds: 120,
    })
    .toPromise();

  return (fallback as BuilderContent | null) || null;
}

export async function getAllVibeAnyPaths(): Promise<string[]> {
  const results = await builder.getAll('content-page', {
    options: {
      noTargeting: true,
    },
  });

  return results?.map((entry) => entry.data?.url || '/') || ['/'];
}
