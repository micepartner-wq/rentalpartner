const fs = require('fs');
const path = require('path');

const SITE_NAME = '렌탈어때';
const SITE_URL = 'https://rentalpartner.kr';
const COMPANY_SITE_URL = 'https://humanpartner.kr/';
const DEFAULT_IMAGE = `${SITE_URL}/logocard.jpg`;
const DEFAULT_PRICE_DISPLAY_MODE = 'visible';
const PRICE_INQUIRY_TEXT = '가격문의';
const BUILD_DATE = new Date().toISOString();
const ROOT_MARKER = '<!-- PAGE_PRERENDER -->';
const STRUCTURED_DATA_MARKER = '<!-- PAGE_STRUCTURED_DATA -->';

const distDir = path.join(__dirname, '..', 'dist');
const baseHtmlPath = path.join(distDir, 'index.html');

const BOARD_META = {
  notice: { title: '공지사항', route: '/notice', description: '렌탈어때 공지사항 페이지입니다.' },
  event: { title: '이벤트', route: '/event', description: '렌탈어때 이벤트 페이지입니다.' },
  review: { title: '설치후기', route: '/review', description: '렌탈어때 설치후기 페이지입니다.' },
};

const STATIC_ROUTES = [
  ['/', '렌탈어때 | 기업 맞춤 종합 렌탈', '기업 행사, 관공서 비품은 렌탈어때! 사무기기부터 대형 MICE 장비까지 맞춤 견적과 대량 납품을 지원하는 종합 렌탈 파트너입니다.', 'daily', '1.0'],
  ['/products', '상품목록 | 렌탈어때', '복합기, 노트북, 데스크탑 등 렌탈어때의 사무기기 렌탈 상품을 확인해보세요.', 'daily', '0.8'],
  ['/cs', '고객센터 | 렌탈어때', '렌탈어때 고객센터입니다. 자주 묻는 질문부터 실시간 상담까지 도와드립니다.', 'monthly', '0.6'],
  ['/notice', '공지사항 - 렌탈어때', '렌탈어때 공지사항 페이지입니다.', 'daily', '0.7'],
  ['/event', '이벤트 - 렌탈어때', '렌탈어때 이벤트 페이지입니다.', 'daily', '0.7'],
  ['/review', '설치후기 - 렌탈어때', '렌탈어때 설치후기 페이지입니다.', 'weekly', '0.7'],
  ['/terms', '서비스 이용약관 | 렌탈어때', '렌탈어때 서비스 이용약관입니다. 회원가입, 견적 요청, 계약 및 정산, 취소 및 환불 관련 기준을 안내합니다.', 'monthly', '0.4'],
  ['/privacy', '개인정보처리방침 | 렌탈어때', '렌탈어때 개인정보처리방침입니다. 수집 항목, 이용 목적, 보유 기간, 이용자 권리와 보호조치를 안내합니다.', 'monthly', '0.4'],
  ['/login', '로그인 | 렌탈어때', '렌탈어때 로그인 페이지입니다.', '', '', 'noindex, nofollow'],
  ['/signup', '회원가입 | 렌탈어때', '렌탈어때 회원가입 페이지입니다.', '', '', 'noindex, nofollow'],
  ['/quote-cart', '장바구니 | 렌탈어때', '여러 품목을 장바구니에 담아 한 번에 견적 요청하세요. 온라인에서는 결제 없이 견적 접수만 진행됩니다.', '', '', 'noindex, nofollow'],
  ['/search', '검색 결과 - 렌탈어때', '렌탈어때 사이트 내 검색 결과 페이지입니다.', '', '', 'noindex, nofollow'],
];

if (!fs.existsSync(baseHtmlPath)) {
  throw new Error(`Missing build output: ${baseHtmlPath}`);
}

const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const env = loadEnv();

const getEnv = (name) => process.env[name] || env[name] || '';
const canonical = (route) =>
  route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route.includes('%') ? route : encodeURI(route)}`;
const DEFAULT_CATEGORY_SLUGS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'categorySlugMap.json'), 'utf8'),
);
const createCategorySlug = (name) => {
  const normalized = String(name || '').replace(/s+/g, ' ').trim();
  if (!normalized) return '';
  if (DEFAULT_CATEGORY_SLUGS[normalized]) return DEFAULT_CATEGORY_SLUGS[normalized];
  return normalized
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[/]/g, ' ')
    .replace(/[^p{Letter}p{Number}s-]/gu, '')
    .replace(/s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};
const getCategorySlug = (category) => String(category.slug || '').trim() || createCategorySlug(category.name);
const jsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const absUrl = (value) => {
  if (!value) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return new URL(value.startsWith('/') ? value : `/${value}`, SITE_URL).toString();
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(value = '') {
  return String(value)
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
}

const truncate = (value, max = 160) =>
  !value || value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trim()}…`;

const seoDescription = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = truncate(stripHtml(candidate || ''));
    if (normalized) return normalized;
  }
  return '';
};

const replaceTag = (html, regex, replacement) => (regex.test(html) ? html.replace(regex, replacement) : html);

function setRobots(html, robots) {
  const robotsRegex = /<meta\s+name="robots"\s+content="[^"]*"\s*\/>\s*/s;
  if (!robots) {
    return html.replace(robotsRegex, '');
  }

  const robotsTag = `    <meta name="robots" content="${escapeHtml(robots)}" />\n`;
  if (robotsRegex.test(html)) {
    return html.replace(robotsRegex, robotsTag);
  }

  return html.replace(/(<meta\s+name="description"\s+content="[^"]*"\s*\/>\s*)/s, `$1${robotsTag}`);
}

const renderStructuredData = (schemas = []) =>
  schemas.map((schema) => `    <script type="application/ld+json">${jsonLd(schema)}</script>`).join('\n');

const normalizePriceDisplayMode = (value) => value === 'inquiry' ? 'inquiry' : DEFAULT_PRICE_DISPLAY_MODE;

const priceText = (price, priceDisplayMode = DEFAULT_PRICE_DISPLAY_MODE) =>
  normalizePriceDisplayMode(priceDisplayMode) === 'inquiry'
    ? PRICE_INQUIRY_TEXT
    : typeof price === 'number' && price > 0
      ? `${new Intl.NumberFormat('ko-KR').format(price)}원/일`
      : PRICE_INQUIRY_TEXT;

const displayDate = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
};

const isoDate = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const breadcrumbSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

const itemListSchema = (name, url, items) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  url,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: item.url,
  })),
});

function parsePostBlocks(content = '') {
  return String(content)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const imageMatch = line.match(/^\[\[image:(https?:\/\/[^\]]+)\]\]$/i);
      return imageMatch ? { type: 'image', value: imageMatch[1] } : { type: 'text', value: line };
    });
}

const postPlainText = (content = '') =>
  parsePostBlocks(content)
    .filter((block) => block.type === 'text')
    .map((block) => block.value)
    .join('\n')
    .trim();

const isBasicProduct = (product) =>
  product.product_type === 'basic' ||
  (!product.product_type &&
    !String(product.category || '').includes('추가') &&
    !String(product.category || '').includes('장소') &&
    !String(product.category || '').includes('음식'));

const productSeoDescription = (product) =>
  seoDescription(product.short_description, product.description) ||
  `${product.name} 렌탈 서비스입니다. 렌탈어때에서 합리적인 조건으로 상담받아보세요.`;

// 본문이 이미지뿐인 글(설치후기 등)은 요약 → 본문 텍스트 순으로 쓰고, 둘 다 없으면 제목을 넣어 글마다 다른 설명문이 되게 한다.
const postSeoDescription = (post, sectionTitle) =>
  seoDescription(post.summary, postPlainText(post.content)) ||
  `${post.title} ${sectionTitle} 상세 페이지입니다. 렌탈어때의 ${sectionTitle} 사례를 확인해 보세요.`;

const genericBody = (title, description) => `
      <main class="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        <section class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(title)}</p>
          <h1 class="mt-3 text-4xl font-black text-slate-900">${escapeHtml(title)}</h1>
          <p class="mt-6 text-base leading-8 text-slate-600">${escapeHtml(description)}</p>
        </section>
      </main>
    `;

const grid = (items) =>
  items.length === 0
    ? '<p class="mt-6 text-sm text-slate-500">표시할 항목이 아직 없습니다.</p>'
    : `<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">${items.join('')}</div>`;

function homeBody(products, postsByBoard, priceDisplayMode) {
  const productCards = products.slice(0, 8).map((product) => `
      <a href="/products/${escapeHtml(product.id)}" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <div class="aspect-square overflow-hidden bg-slate-100"><img src="${escapeHtml(absUrl(product.image_url))}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover" /></div>
        <div class="space-y-2 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(product.category || '사무기기')}</p>
          <h2 class="text-lg font-bold text-slate-900">${escapeHtml(product.name)}</h2>
          <p class="text-sm text-slate-500">${escapeHtml(productSeoDescription(product))}</p>
          <p class="text-base font-bold text-[#001E45]">${escapeHtml(priceText(product.price, priceDisplayMode))}</p>
        </div>
      </a>
    `);

  const postSections = Object.entries(BOARD_META).map(([boardType, meta]) => {
    const items = (postsByBoard[boardType] || []).slice(0, 2).map((post) => `
        <li class="rounded-xl border border-slate-200 bg-white p-4">
          <a href="${escapeHtml(`${meta.route}/${post.id}`)}" class="block">
            <h3 class="text-base font-bold text-slate-900">${escapeHtml(post.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">${escapeHtml(postSeoDescription(post, meta.title))}</p>
          </a>
        </li>
      `).join('');

    return `
      <section class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(meta.title)}</p>
            <h2 class="mt-2 text-2xl font-black text-slate-900">${escapeHtml(meta.description)}</h2>
          </div>
          <a href="${escapeHtml(meta.route)}" class="text-sm font-semibold text-[#001E45]">더 보기</a>
        </div>
        <ul class="mt-5 space-y-3">${items || '<li class="text-sm text-slate-500">등록된 게시글이 없습니다.</li>'}</ul>
      </section>
    `;
  }).join('');

  return `
      <main class="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <section class="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-6 py-12 text-white md:px-10 md:py-16">
          <p class="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-200">Office Rental Platform</p>
          <h1 class="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">사무기기 렌탈을 더 빠르고 명확하게, 렌탈어때</h1>
          <p class="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">복합기, 노트북, 데스크탑, 프린터 등 기업 운영에 필요한 사무기기를 렌탈어때에서 합리적인 조건으로 상담하고 비교할 수 있습니다.</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a href="/products" class="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900">상품 보러가기</a>
            <a href="${escapeHtml(COMPANY_SITE_URL)}" class="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white">회사소개</a>
          </div>
        </section>
        <section class="mt-12">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Featured Products</p>
              <h2 class="mt-2 text-3xl font-black text-slate-900">주요 렌탈 상품</h2>
            </div>
            <a href="/products" class="text-sm font-semibold text-[#001E45]">전체 상품 보기</a>
          </div>
          ${grid(productCards)}
        </section>
        <section class="mt-14 grid gap-6 lg:grid-cols-3">${postSections}</section>
      </main>
    `;
}

function productListBody(products, priceDisplayMode, meta = {}) {
  const cards = products.slice(0, 24).map((product) => `
      <a href="/products/${escapeHtml(product.id)}" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <div class="aspect-square overflow-hidden bg-slate-100"><img src="${escapeHtml(absUrl(product.image_url))}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover" /></div>
        <div class="space-y-2 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(product.category || '사무기기')}</p>
          <h2 class="text-lg font-bold text-slate-900">${escapeHtml(product.name)}</h2>
          <p class="text-sm text-slate-500">${escapeHtml(productSeoDescription(product))}</p>
          <p class="text-base font-bold text-[#001E45]">${escapeHtml(priceText(product.price, priceDisplayMode))}</p>
        </div>
      </a>
    `);

  return `
      <main class="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <section class="rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-10 md:px-8">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Products</p>
          <h1 class="mt-3 text-4xl font-black text-slate-900">${escapeHtml(meta.heading || '상품목록')}</h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-600">${escapeHtml(meta.intro || '복합기, 노트북, 데스크탑, 프린터 등 렌탈어때의 주요 사무기기 상품을 한눈에 확인할 수 있습니다.')}</p>
          <p class="mt-3 text-sm font-medium text-slate-500">현재 노출 상품 ${products.length}개</p>
        </section>
        ${grid(cards)}
      </main>
    `;
}

function boardListBody(boardType, posts) {
  const meta = BOARD_META[boardType];
  const cards = posts.slice(0, 12).map((post) => `
      <a href="${escapeHtml(`${meta.route}/${post.id}`)}" class="overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <div class="aspect-[16/10] overflow-hidden bg-slate-100"><img src="${escapeHtml(absUrl(post.image_url || post.mobile_image_url))}" alt="${escapeHtml(post.title)}" class="h-full w-full object-cover" /></div>
        <div class="space-y-3 p-5">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(displayDate(post.created_at) || meta.title)}</p>
          <h2 class="text-xl font-black text-slate-900">${escapeHtml(post.title)}</h2>
          <p class="text-sm leading-6 text-slate-600">${escapeHtml(postSeoDescription(post, meta.title))}</p>
        </div>
      </a>
    `);

  return `
      <main class="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <section class="rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-10 md:px-8">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(meta.title)}</p>
          <h1 class="mt-3 text-4xl font-black text-slate-900">${escapeHtml(meta.title)}</h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-600">${escapeHtml(meta.description)}</p>
          <p class="mt-3 text-sm font-medium text-slate-500">현재 노출 게시글 ${posts.length}건</p>
        </section>
        ${grid(cards)}
      </main>
    `;
}

function productBody(product, priceDisplayMode) {
  return `
      <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <nav class="mb-6 text-sm text-slate-500"><a href="/">홈</a><span class="mx-2">/</span><a href="/products">상품목록</a><span class="mx-2">/</span><span>${escapeHtml(product.name)}</span></nav>
        <article class="grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] md:p-8">
          <div class="flex items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"><img src="${escapeHtml(absUrl(product.image_url))}" alt="${escapeHtml(product.name)}" class="block h-auto w-full max-h-[420px] object-contain md:max-h-[560px] lg:max-h-[680px]" /></div>
          <div class="flex flex-col justify-center">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(product.category || '사무기기')}</p>
            <h1 class="mt-3 text-3xl font-black text-slate-900 md:text-4xl">${escapeHtml(product.name)}</h1>
            <p class="mt-5 text-base leading-7 text-slate-600">${escapeHtml(productSeoDescription(product))}</p>
            <div class="mt-6 rounded-2xl bg-slate-50 p-5">
            <p class="text-sm text-slate-500">렌탈 안내</p>
              <p class="mt-2 text-2xl font-black text-[#001E45]">${escapeHtml(priceText(product.price, priceDisplayMode))}</p>
              <p class="mt-3 text-sm leading-6 text-slate-500">상세 옵션과 설치 일정은 견적 상담을 통해 확인하실 수 있습니다. 렌탈어때가 기업 환경에 맞는 구성을 제안해드립니다.</p>
            </div>
          </div>
        </article>
      </main>
    `;
}

function postBody(post) {
  const meta = BOARD_META[post.board_type] || BOARD_META.notice;
  const blocks = parsePostBlocks(post.content);
  const body = blocks.map((block, index) =>
    block.type === 'image'
      ? `<figure class="overflow-hidden border border-slate-200 bg-slate-50"><img src="${escapeHtml(block.value)}" alt="${escapeHtml(`${post.title} 이미지 ${index + 1}`)}" class="h-auto w-full object-contain" /></figure>`
      : `<p class="text-base leading-8 text-slate-700">${escapeHtml(block.value)}</p>`
  ).join('');

  return `
      <main class="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <nav class="mb-6 text-sm text-slate-500"><a href="/">홈</a><span class="mx-2">/</span><a href="${escapeHtml(meta.route)}">${escapeHtml(meta.title)}</a><span class="mx-2">/</span><span>${escapeHtml(post.title)}</span></nav>
        <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <header class="border-b border-slate-100 pb-6">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(meta.title)}</p>
            <h1 class="mt-3 text-3xl font-black text-slate-900 md:text-4xl">${escapeHtml(post.title)}</h1>
            <p class="mt-4 text-sm text-slate-500">${escapeHtml(displayDate(post.created_at) || '')}</p>
          </header>
          <div class="mt-8 overflow-hidden border border-slate-100 bg-slate-50"><img src="${escapeHtml(absUrl(post.image_url || post.mobile_image_url))}" alt="${escapeHtml(post.title)}" class="h-auto w-full object-contain" /></div>
          <div class="mt-8 space-y-6">${body || '<p class="text-base leading-8 text-slate-700">등록된 상세 내용이 없습니다.</p>'}</div>
        </article>
      </main>
    `;
}

async function fetchRows(resourcePath) {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase environment variables.');

  const response = await fetch(`${supabaseUrl}/rest/v1/${resourcePath}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchProducts() {
  const rows = await fetchRows('products?select=id,name,category,price,description,short_description,image_url,created_at,product_type,stock&order=created_at.desc');
  return rows.filter(isBasicProduct);
}

async function fetchCategories() {
  try {
    return await fetchRows('categories?select=id,name,slug,parent_id,display_order&order=display_order.asc');
  } catch (error) {
    console.warn(`Category fetch fallback: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function fetchPosts() {
  return fetchRows('mice_tab_posts?select=id,board_type,title,summary,content,image_url,mobile_image_url,created_at,updated_at,is_active&is_active=eq.true&order=display_order.asc&order=created_at.desc');
}

async function fetchPriceDisplayMode() {
  try {
    const rows = await fetchRows('site_settings?select=setting_key,setting_value&setting_key=eq.product_price_display_mode');
    return normalizePriceDisplayMode(rows[0]?.setting_value);
  } catch (error) {
    console.warn(`Price display mode fallback: ${error instanceof Error ? error.message : String(error)}`);
    return DEFAULT_PRICE_DISPLAY_MODE;
  }
}

function buildHtml(page) {
  const pageCanonical = canonical(page.route);
  const pageImage = absUrl(page.image || DEFAULT_IMAGE);
  let html = baseHtml;

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `    <title>${escapeHtml(page.title)}</title>`);
  html = replaceTag(html, /<link rel="canonical" href="[^"]*" \/>/s, `    <link rel="canonical" href="${escapeHtml(pageCanonical)}" />`);
  html = replaceTag(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/>/s, `    <meta name="description" content="${escapeHtml(page.description)}" />`);
  html = replaceTag(html, /<meta\s+property="og:type"\s+content="[^"]*"\s*\/>/s, `    <meta property="og:type" content="${escapeHtml(page.ogType || 'website')}" />`);
  html = replaceTag(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/s, `    <meta property="og:url" content="${escapeHtml(pageCanonical)}" />`);
  html = replaceTag(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/s, `    <meta property="og:title" content="${escapeHtml(page.title)}" />`);
  html = replaceTag(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/s, `    <meta property="og:description" content="${escapeHtml(page.description)}" />`);
  html = replaceTag(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/s, `    <meta property="og:image" content="${escapeHtml(pageImage)}" />`);
  html = replaceTag(html, /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/>/s, `    <meta property="og:image:secure_url" content="${escapeHtml(pageImage)}" />`);
  html = replaceTag(html, /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/>/s, `    <meta property="og:image:alt" content="${escapeHtml(page.imageAlt || page.title)}" />`);
  html = replaceTag(html, /<meta\s+property="twitter:title"\s+content="[^"]*"\s*\/>/s, `    <meta property="twitter:title" content="${escapeHtml(page.title)}" />`);
  html = replaceTag(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/s, `    <meta name="twitter:description" content="${escapeHtml(page.description)}" />`);
  html = replaceTag(html, /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/s, `    <meta name="twitter:image" content="${escapeHtml(pageImage)}" />`);
  html = setRobots(html, page.robots);
  html = html.replace(STRUCTURED_DATA_MARKER, renderStructuredData(page.structuredData || []));
  // 정적 본문은 data-prerender 로 감싸 index.html 의 CSS 가 화면에서 숨긴다(검색엔진은 그대로 읽음).
  // 함수 형태로 치환해 본문 안의 "$" 문자가 치환 패턴으로 해석되지 않게 한다.
  html = html.replace(ROOT_MARKER, () => (page.bodyHtml ? `\n<div data-prerender="true">${page.bodyHtml}</div>\n    ` : ''));
  return html;
}

function writeRoute(route, html) {
  if (route === '/') {
    fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
    return;
  }

  const targetDir = path.join(distDir, route.replace(/^\/+/, ''));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');
}

function writeSitemap(pages) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .filter((page) => page.includeInSitemap !== false)
    .map((page) => {
      const lines = ['  <url>', `    <loc>${escapeXml(canonical(page.route))}</loc>`];
      if (page.lastmod) lines.push(`    <lastmod>${escapeXml(page.lastmod)}</lastmod>`);
      if (page.changefreq) lines.push(`    <changefreq>${escapeXml(page.changefreq)}</changefreq>`);
      if (page.priority) lines.push(`    <priority>${escapeXml(page.priority)}</priority>`);
      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n')}\n</urlset>\n`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
}

function writeRss(pages) {
  const rssItems = pages
    .filter((page) => page.includeInSitemap !== false)
    .map((page) => {
      const pubDate = page.lastmod ? `      <pubDate>${new Date(page.lastmod).toUTCString()}</pubDate>\n` : '';
      return `    <item>
      <title>${escapeXml(page.title)}</title>
      <link>${escapeXml(canonical(page.route))}</link>
      <description>${escapeXml(page.description)}</description>
${pubDate}    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_NAME)} | 기업 맞춤 종합 렌탈</title>
    <link>${escapeXml(SITE_URL)}/</link>
    <description>기업 행사, 관공서 비품은 렌탈어때! 사무기기부터 대형 MICE 장비까지 맞춤 견적과 대량 납품을 지원하는 종합 렌탈 파트너입니다.</description>
    <language>ko</language>
${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(distDir, 'rss.xml'), xml, 'utf8');
}

function buildStaticPages(products, postsByBoard, priceDisplayMode) {
  return STATIC_ROUTES.map(([route, title, description, changefreq, priority, robots]) => {
    let bodyHtml = genericBody(title, description);
    let structuredData = [];

    if (route === '/') {
      bodyHtml = '';
      structuredData = [
        itemListSchema('렌탈어때 주요 상품', canonical('/products'), products.slice(0, 8).map((product) => ({
          name: product.name,
          url: canonical(`/products/${product.id}`),
        }))),
      ];
    } else if (route === '/products') {
      bodyHtml = productListBody(products, priceDisplayMode);
      structuredData = [
        itemListSchema('렌탈어때 상품목록', canonical('/products'), products.slice(0, 24).map((product) => ({
          name: product.name,
          url: canonical(`/products/${product.id}`),
        }))),
      ];
    } else {
      const boardType = Object.keys(BOARD_META).find((key) => BOARD_META[key].route === route);
      if (boardType) {
        const posts = postsByBoard[boardType] || [];
        bodyHtml = boardListBody(boardType, posts);
        structuredData = [
          itemListSchema(`${BOARD_META[boardType].title} 목록`, canonical(route), posts.slice(0, 12).map((post) => ({
            name: post.title,
            url: canonical(`${route}/${post.id}`),
          }))),
        ];
      }
    }

    return {
      route,
      title,
      description,
      image: DEFAULT_IMAGE,
      bodyHtml,
      structuredData,
      robots,
      changefreq,
      priority,
      lastmod: BUILD_DATE,
      includeInSitemap: !robots,
    };
  });
}

function buildCategoryPages(categories, products, priceDisplayMode) {
  const roots = categories.filter((category) => !category.parent_id);
  const pages = [];

  const addPage = (route, trail, members) => {
    if (members.length === 0) return;
    const name = trail[trail.length - 1].name;
    const title = `${name} 렌탈 | 렌탈어때`;
    const description = `${name} 렌탈 상품 ${members.length}개를 확인하세요. 렌탈어때에서 맞춤 견적과 상담을 받아보실 수 있습니다.`;

    pages.push({
      route,
      title,
      description,
      image: absUrl(members.find((product) => product.image_url)?.image_url),
      imageAlt: name,
      bodyHtml: productListBody(members, priceDisplayMode, { heading: name, intro: description }),
      structuredData: [
        breadcrumbSchema([
          { name: '홈', url: canonical('/') },
          { name: '상품목록', url: canonical('/products') },
          ...trail.map((item, index) => ({
            name: item.name,
            url: canonical(index === 0 ? `/products/${trail[0].slug}` : route),
          })),
        ]),
        itemListSchema(`${name} 상품목록`, canonical(route), members.slice(0, 24).map((product) => ({
          name: product.name,
          url: canonical(`/products/${product.id}`),
        }))),
      ],
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: BUILD_DATE,
    });
  };

  roots.forEach((root) => {
    const rootSlug = getCategorySlug(root);
    if (!rootSlug) return;
    const children = categories.filter((category) => category.parent_id === root.id);
    const childNames = new Set(children.map((child) => child.name));

    const rootMembers = products.filter(
      (product) => product.category === root.name || childNames.has(product.category),
    );
    addPage(`/products/${rootSlug}`, [{ name: root.name, slug: rootSlug }], rootMembers);

    children.forEach((child) => {
      const childSlug = getCategorySlug(child);
      if (!childSlug) return;
      addPage(
        `/products/${rootSlug}/${childSlug}`,
        [{ name: root.name, slug: rootSlug }, { name: child.name, slug: childSlug }],
        products.filter((product) => product.category === child.name),
      );
    });
  });

  return pages;
}

function buildProductPages(products, priceDisplayMode) {
  return products.map((product) => {
    const route = `/products/${product.id}`;
    const description = productSeoDescription(product);
    const image = absUrl(product.image_url);

    return {
      route,
      title: `${product.name} | 렌탈어때`,
      description,
      image,
      imageAlt: product.name,
      ogType: 'product',
      bodyHtml: productBody(product, priceDisplayMode),
      structuredData: [
        breadcrumbSchema([
          { name: '홈', url: canonical('/') },
          { name: '상품목록', url: canonical('/products') },
          { name: product.name, url: canonical(route) },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description,
          image: [image],
          category: product.category || undefined,
          sku: product.id,
          brand: { '@type': 'Brand', name: SITE_NAME },
          offers: normalizePriceDisplayMode(priceDisplayMode) !== 'inquiry' && typeof product.price === 'number' && product.price > 0 ? {
            '@type': 'Offer',
            priceCurrency: 'KRW',
            price: product.price,
            availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            url: canonical(route),
            seller: { '@type': 'Organization', name: SITE_NAME },
          } : undefined,
        },
      ],
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: isoDate(product.created_at) || BUILD_DATE,
    };
  });
}

function buildPostPages(posts) {
  return posts.map((post) => {
    const meta = BOARD_META[post.board_type] || BOARD_META.notice;
    const route = `${meta.route}/${post.id}`;
    const description = postSeoDescription(post, meta.title);
    const image = absUrl(post.image_url || post.mobile_image_url);

    return {
      route,
      title: `${post.title} - ${meta.title} - 렌탈어때`,
      description,
      image,
      imageAlt: post.title,
      ogType: 'article',
      bodyHtml: postBody(post),
      structuredData: [
        breadcrumbSchema([
          { name: '홈', url: canonical('/') },
          { name: meta.title, url: canonical(meta.route) },
          { name: post.title, url: canonical(route) },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description,
          mainEntityOfPage: canonical(route),
          image: [image],
          datePublished: isoDate(post.created_at) || undefined,
          dateModified: isoDate(post.updated_at || post.created_at) || undefined,
          articleSection: meta.title,
          author: { '@type': 'Organization', name: SITE_NAME },
          publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE } },
        },
      ],
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: isoDate(post.updated_at || post.created_at) || BUILD_DATE,
    };
  });
}

async function main() {
  let products = [];
  let categories = [];
  let posts = [];
  let priceDisplayMode = DEFAULT_PRICE_DISPLAY_MODE;

  try {
    [products, categories, posts, priceDisplayMode] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchPosts(),
      fetchPriceDisplayMode(),
    ]);
  } catch (error) {
    console.warn(`SEO asset generation fallback: ${error instanceof Error ? error.message : String(error)}`);
  }

  const postsByBoard = posts.reduce((acc, post) => {
    if (!acc[post.board_type]) acc[post.board_type] = [];
    acc[post.board_type].push(post);
    return acc;
  }, {});

  const pages = [
    ...buildStaticPages(products, postsByBoard, priceDisplayMode),
    ...buildCategoryPages(categories, products, priceDisplayMode),
    ...buildProductPages(products, priceDisplayMode),
    ...buildPostPages(posts),
  ];

  for (const page of pages) {
    writeRoute(page.route, buildHtml(page));
  }

  writeSitemap(pages);
  writeRss(pages);
  console.log(`Generated prerendered HTML for ${pages.length} routes, a dynamic sitemap, and RSS feed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

