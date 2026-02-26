export interface EmbedInfo {
  provider: string;
  embedUrl: string;
  thumbnailUrl?: string;
}

const patterns: Array<{
  provider: string;
  regex: RegExp;
  toEmbed: (match: RegExpMatchArray) => string;
  toThumbnail?: (match: RegExpMatchArray) => string;
}> = [
  {
    provider: 'youtube',
    regex: /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    toEmbed: (m) => `https://www.youtube-nocookie.com/embed/${m[1]}`,
    toThumbnail: (m) => `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`,
  },
  {
    provider: 'google-docs',
    regex: /docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/,
    toEmbed: (m) => `https://docs.google.com/${m[1]}/d/${m[2]}/preview`,
  },
  {
    provider: 'codesandbox',
    regex: /codesandbox\.io\/(?:s|embed)\/([a-zA-Z0-9_-]+)/,
    toEmbed: (m) => `https://codesandbox.io/embed/${m[1]}`,
  },
  {
    provider: 'codepen',
    regex: /codepen\.io\/([a-zA-Z0-9_-]+)\/pen\/([a-zA-Z0-9_-]+)/,
    toEmbed: (m) => `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result`,
  },
  {
    provider: 'vimeo',
    regex: /vimeo\.com\/(\d+)/,
    toEmbed: (m) => `https://player.vimeo.com/video/${m[1]}`,
  },
];

export function detectEmbed(url: string): EmbedInfo | null {
  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      return {
        provider: pattern.provider,
        embedUrl: pattern.toEmbed(match),
        thumbnailUrl: pattern.toThumbnail?.(match),
      };
    }
  }
  return null;
}
