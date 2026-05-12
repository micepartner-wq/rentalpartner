export const SITE_NAME = '렌탈어때';
export const SITE_URL = 'https://rentalpartner.kr';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logocard.jpg`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

export const toAbsoluteUrl = (value?: string | null): string => {
  if (!value) return DEFAULT_OG_IMAGE;
  if (ABSOLUTE_URL_PATTERN.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;

  return new URL(value.startsWith('/') ? value : `/${value}`, SITE_URL).toString();
};

export const stripHtmlTags = (value?: string | null): string => {
  if (!value) return '';

  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

export const truncateText = (value: string, maxLength = 160): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
};

export const buildSeoDescription = (
  ...candidates: Array<string | null | undefined>
): string => {
  for (const candidate of candidates) {
    const normalized = stripHtmlTags(candidate);
    if (normalized) {
      return truncateText(normalized);
    }
  }

  return '';
};

export const toJsonLd = (value: Record<string, unknown>): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');

export const buildOrganizationJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: DEFAULT_OG_IMAGE,
  email: 'mailto:micepartner@micepartner.co.kr',
});

export const buildWebsiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  publisher: {
    '@id': ORGANIZATION_ID,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});

export const buildBreadcrumbJsonLd = (
  items: Array<{ name: string; item: string }>
) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((entry, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: entry.name,
    item: entry.item,
  })),
});

export const buildProductJsonLd = (input: {
  name: string;
  description: string;
  url: string;
  image: string;
  category?: string;
  sku?: string;
  price?: number;
  stock?: number;
  includeOffers?: boolean;
}) => ({
  '@type': 'Product',
  name: input.name,
  description: input.description,
  image: [input.image],
  category: input.category,
  sku: input.sku,
  brand: {
    '@type': 'Brand',
    name: SITE_NAME,
  },
  offers:
    input.includeOffers !== false &&
    typeof input.price === 'number' && input.price > 0
      ? {
          '@type': 'Offer',
          priceCurrency: 'KRW',
          price: input.price,
          availability:
            input.stock === 0
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          url: input.url,
          seller: {
            '@id': ORGANIZATION_ID,
          },
        }
      : undefined,
});

export const buildArticleJsonLd = (input: {
  headline: string;
  description: string;
  url: string;
  image: string;
  datePublished?: string;
  dateModified?: string;
  articleSection?: string;
}) => ({
  '@type': 'Article',
  headline: input.headline,
  description: input.description,
  mainEntityOfPage: input.url,
  image: [input.image],
  datePublished: input.datePublished,
  dateModified: input.dateModified || input.datePublished,
  articleSection: input.articleSection,
  author: {
    '@id': ORGANIZATION_ID,
  },
  publisher: {
    '@id': ORGANIZATION_ID,
  },
});

