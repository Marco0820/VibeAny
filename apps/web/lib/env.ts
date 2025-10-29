const DEFAULT_API_BASE = 'http://localhost:8080';
const DEFAULT_WS_BASE = 'ws://localhost:8080';

let cachedApiBase: string | null = null;
let cachedWsBase: string | null = null;

function normalizeBase(url: string): string {
  return url.replace(/\/$/, '');
}

export function getApiBase(): string {
  if (cachedApiBase) return cachedApiBase;
  const envValue = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (envValue) {
    cachedApiBase = normalizeBase(envValue);
    return cachedApiBase;
  }
  if (typeof window !== 'undefined') {
    cachedApiBase = normalizeBase(window.location.origin);
    return cachedApiBase;
  }
  cachedApiBase = DEFAULT_API_BASE;
  return cachedApiBase;
}

export function getWsBase(): string {
  if (cachedWsBase) return cachedWsBase;
  const envValue = process.env.NEXT_PUBLIC_WS_BASE?.trim();
  if (envValue) {
    cachedWsBase = normalizeBase(envValue);
    return cachedWsBase;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    cachedWsBase = `${protocol}://${window.location.host}`;
    return cachedWsBase;
  }
  cachedWsBase = DEFAULT_WS_BASE;
  return cachedWsBase;
}

export const API_BASE = getApiBase();
export const WS_BASE = getWsBase();
