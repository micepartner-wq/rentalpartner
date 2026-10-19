const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// Compile the actual TS modules with an in-memory database boundary. No real writes.
function loadTs(relativePath, mocks = {}, cache = new Map()) {
    const absolute = path.resolve(root, relativePath);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = specifier => {
        if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
        if (specifier.startsWith('.')) {
            const base = path.resolve(path.dirname(absolute), specifier);
            const target = [base, base + '.ts', base + '.tsx'].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
            return loadTs(path.relative(root, target), mocks, cache);
        }
        return require(specifier);
    };
    new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
    return module.exports;
}

const util = loadTs('src/utils/reviewPhotos.ts');
const photo = (id, tags = [], url = '/p-' + id + '.jpg') => ({ id, image_url: url, caption: '', hotspots: tags.map((productId, i) => ({ id: id + '-t' + i, product_id: productId, x: 10, y: 20 })) });

test('read normalization drops unsafe photos and caps the count', () => {
    assert.deepEqual(util.normalizeReviewPhotos(undefined), []);
    const unsafe = { ...photo('bad'), image_url: 'javascript:alert(1)' };
    const many = Array.from({ length: 12 }, (_, i) => photo('p' + i));
    const result = util.normalizeReviewPhotos([photo('a'), unsafe, ...many]);
    assert.equal(result.length, util.MAX_REVIEW_PHOTOS);
    assert.equal(result[0].id, 'a');
});

test('write validation enforces the 10 photo limit and uses plain wording', () => {
    assert.equal(util.getReviewPhotosValidationError([photo('a'), photo('b')]), null);
    assert.match(util.getReviewPhotosValidationError(Array.from({ length: 11 }, (_, i) => photo('p' + i))), /최대 10장/);
    const error = util.getReviewPhotosValidationError([{ ...photo('a'), image_url: 'javascript:alert(1)' }]);
    assert.ok(error); assert.doesNotMatch(error, /설치사진/);
    assert.ok(util.getReviewPhotosValidationError('not-an-array'));
});

test('tagged product ids are deduplicated in photo and tag order', () => {
    assert.deepEqual(util.getReviewTaggedProductIds([photo('a', ['chair', 'pc']), photo('b', ['pc', 'monitor'])]), ['chair', 'pc', 'monitor']);
    assert.deepEqual(util.getReviewTaggedProductIds([]), []);
});

test('legacy content with inline image tokens is split into photos in order and plain text', () => {
    const content = '첫 문단입니다.\n\n[[image:https://img.test/a.jpg]]\n\n둘째 문단\n[[image:https://img.test/b.jpg]]\n\n대표이미지 선택\n마지막 문단';
    const { urls, text } = util.splitLegacyContent(content);
    assert.deepEqual(urls, ['https://img.test/a.jpg', 'https://img.test/b.jpg']);
    assert.equal(text, '첫 문단입니다.\n\n둘째 문단\n\n마지막 문단');
    assert.deepEqual(util.splitLegacyContent(undefined), { urls: [], text: '' });
});

test('missing images column is recognised only for that column', () => {
    assert.equal(util.isMissingReviewImagesError({ code: 'PGRST204', message: "Could not find the 'images' column of 'mice_tab_posts' in the schema cache" }), true);
    assert.equal(util.isMissingReviewImagesError({ code: '42703', message: 'column "images" does not exist' }), true);
    assert.equal(util.isMissingReviewImagesError({ code: 'PGRST204', message: "Could not find the 'mobile_image_url' column" }), false);
    assert.equal(util.isMissingReviewImagesError(null), false);
});

function mockCms(responses) {
    const calls = [];
    const supabase = { from(table) {
        const call = { table };
        calls.push(call);
        const query = {
            insert(payload) { call.insert = payload; return query; },
            update(payload) { call.update = payload; return query; },
            select() { return query; }, eq() { return query; }, single() { return query; },
            then(resolve, reject) { return Promise.resolve(responses.shift()).then(resolve, reject); },
        };
        return query;
    } };
    return { api: loadTs('src/api/cmsApi.ts', { '../lib/supabase': { supabase } }), calls };
}
const missingImages = { error: { code: 'PGRST204', message: "Could not find the 'images' column of 'mice_tab_posts' in the schema cache" } };
const basePost = { board_type: 'review', title: '테스트', content: '본문', display_order: 1, is_active: true };

test('posts without photos still save on a database that lacks the images column', async () => {
    const { api, calls } = mockCms([missingImages, { data: { id: 'new' } }]);
    const result = await api.addBoardPost({ ...basePost, images: [] });
    assert.equal(result.id, 'new');
    assert.equal(calls.length, 2);
    assert.ok('images' in calls[0].insert[0]); assert.equal('images' in calls[1].insert[0], false);
});

test('posts with photos fail with a clear message when the images column is missing', async () => {
    const { api } = mockCms([missingImages]);
    await assert.rejects(api.addBoardPost({ ...basePost, images: [photo('a', ['chair'])] }), /add_mice_tab_posts_images\.sql/);
    const update = mockCms([missingImages]);
    await assert.rejects(update.api.updateBoardPost('id', { images: [photo('a')] }), /add_mice_tab_posts_images\.sql/);
});

test('photos are validated before any write and saved exactly as normalized', async () => {
    const { api, calls } = mockCms([{ data: { id: 'ok' } }]);
    await assert.rejects(api.addBoardPost({ ...basePost, images: Array.from({ length: 11 }, (_, i) => photo('p' + i)) }), /최대 10장/);
    assert.equal(calls.length, 0, 'invalid photos never reach the database');
    const saved = [photo('a', ['chair']), photo('b')];
    await api.addBoardPost({ ...basePost, images: saved });
    assert.deepEqual(calls[0].insert[0].images, saved);
    const none = mockCms([{ data: { id: 'x' } }]);
    await none.api.updateBoardPost('x', { title: '제목만 수정' });
    assert.equal('images' in none.calls[0].update, false, 'omitting images leaves them untouched');
});
