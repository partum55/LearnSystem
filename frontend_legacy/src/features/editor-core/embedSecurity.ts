export type EmbedProvider = 'youtube' | 'pdf';

export type SafeEmbed = {
  embedUrl: string;
  sourceUrl: string;
};

const EMBED_PROTOCOL_ALLOWLIST = new Set(['https:', 'http:']);
const YOUTUBE_HOST_ALLOWLIST = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
];

const normalizeHost = (host: string): string => host.trim().toLowerCase();

const hostAllowed = (host: string, allowlist: string[]): boolean => {
  const normalizedHost = normalizeHost(host);
  return allowlist.some((item) => {
    const normalizedItem = normalizeHost(item);
    if (!normalizedItem) return false;
    if (normalizedItem.startsWith('*.')) {
      const bare = normalizedItem.slice(2);
      return normalizedHost === bare || normalizedHost.endsWith(`.${bare}`);
    }
    return normalizedHost === normalizedItem;
  });
};

const readPdfAllowlist = (): string[] => {
  const configured = (import.meta.env.VITE_PDF_EMBED_ALLOWLIST || '')
    .split(',')
    .map((host: string) => host.trim())
    .filter(Boolean);
  const localHost = typeof window !== 'undefined' ? [window.location.hostname] : [];
  return Array.from(new Set([...localHost, ...configured]));
};

export const parseEmbedUrl = (rawUrl: string): URL | null => {
  const value = rawUrl.trim();
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    if (value.startsWith('/')) {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        return new URL(value, origin);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const extractYouTubeVideoId = (url: URL): string | null => {
  const host = normalizeHost(url.hostname);
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const segment = url.pathname.split('/').filter(Boolean)[0];
    return segment || null;
  }

  if (hostAllowed(host, YOUTUBE_HOST_ALLOWLIST)) {
    const fromWatch = url.searchParams.get('v');
    if (fromWatch) return fromWatch;

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'embed' && parts[1]) {
      return parts[1];
    }
    if (parts[0] === 'shorts' && parts[1]) {
      return parts[1];
    }
  }

  return null;
};

export const resolveSafeEmbed = (provider: EmbedProvider, rawUrl: string): SafeEmbed | null => {
  const parsed = parseEmbedUrl(rawUrl);
  if (!parsed) return null;
  if (!EMBED_PROTOCOL_ALLOWLIST.has(parsed.protocol)) return null;

  if (provider === 'youtube') {
    if (!hostAllowed(parsed.hostname, YOUTUBE_HOST_ALLOWLIST)) return null;
    const videoId = extractYouTubeVideoId(parsed);
    if (!videoId || !/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return null;

    return {
      sourceUrl: parsed.href,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    };
  }

  const pdfAllowlist = readPdfAllowlist();
  if (!hostAllowed(parsed.hostname, pdfAllowlist)) return null;
  if (!/\.pdf(?:[?#].*)?$/i.test(parsed.href)) return null;

  return {
    sourceUrl: parsed.href,
    embedUrl: parsed.href,
  };
};
