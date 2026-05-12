const GNB_IMAGE_TOKEN_PATTERN = /^\[\[image:(https?:\/\/[^\]]+)\]\]$/i;
const GNB_IMAGE_TOKEN_GLOBAL_PATTERN = /\[\[image:(https?:\/\/[^\]]+)\]\]/gi;
const CONTROL_TEXT_LINES = new Set(['대표이미지', '대표이미지 선택', '대표이미지 선택됨']);

export interface GnbContentBlock {
  type: 'text' | 'image';
  value: string;
}

const getImageTokenUrl = (line: string): string | null => {
  const match = line.trim().match(GNB_IMAGE_TOKEN_PATTERN);
  return match ? match[1].trim() : null;
};

export const buildGnbContentImageToken = (imageUrl: string): string => `[[image:${imageUrl}]]`;

export const extractGnbContentImageUrls = (content?: string): string[] => {
  if (!content) return [];

  return Array.from(content.matchAll(GNB_IMAGE_TOKEN_GLOBAL_PATTERN))
    .map((match) => (match[1] || '').trim())
    .filter((url) => url.length > 0);
};

export const stripGnbContentImages = (content?: string): string => {
  if (!content) return '';

  return content
    .replace(GNB_IMAGE_TOKEN_GLOBAL_PATTERN, '\n')
    .split(/\r?\n/)
    .filter((line) => {
      const normalized = line.trim();
      if (!normalized) return false;
      return !CONTROL_TEXT_LINES.has(normalized);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const parseGnbContent = (content?: string): GnbContentBlock[] => {
  if (!content) return [];

  const blocks: GnbContentBlock[] = [];
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const pushTextBlock = (rawText: string) => {
    const textValue = rawText
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => !CONTROL_TEXT_LINES.has(line.trim()))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (textValue) {
      blocks.push({ type: 'text', value: textValue });
    }
  };

  let cursor = 0;
  for (const match of normalizedContent.matchAll(GNB_IMAGE_TOKEN_GLOBAL_PATTERN)) {
    const fullMatch = match[0];
    const imageUrl = (match[1] || '').trim();
    const index = match.index ?? -1;
    if (index < 0) continue;

    pushTextBlock(normalizedContent.slice(cursor, index));
    if (imageUrl) {
      blocks.push({ type: 'image', value: imageUrl });
    }
    cursor = index + fullMatch.length;
  }

  pushTextBlock(normalizedContent.slice(cursor));
  return blocks;
};
