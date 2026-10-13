const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const root = path.resolve(__dirname, '..');

// Compile the actual TS modules with an in-memory database boundary. No real writes.
function loadTs(relativePath, mocks = {}, cache = new Map()) {
    const absolute = path.resolve(root, relativePath);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = specifier => {
        if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
        if (specifier.endsWith('.css')) return {};
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
const util = loadTs('src/utils/installationScenes.ts');
const productId = '11111111-1111-4111-8111-111111111111';
const fixture = () => [{ id: 'scene-1', image_url: '/discovery-office.svg', caption: '설치 사례', hotspots: [
    { id: 'tag-1', product_id: productId, x: 0, y: 100, inclusion: 'included' },
] }];

function mockApi(responses) {
    const calls = [];
    const supabase = { from(table) {
        const call = { table };
        calls.push(call);
        const query = {
            insert(payload) { call.insert = payload; return query; },
            update(payload) { call.update = payload; return query; },
            select(fields) { call.select = fields; return query; },
            eq(key, value) { call.eq = [key, value]; return query; },
            in(key, value) { call.in = [key, value]; return query; },
            single() { return query; },
            then(resolve, reject) {
                if (!responses.length) return Promise.reject(new Error('Unexpected database request')).then(resolve, reject);
                return Promise.resolve(responses.shift()).then(resolve, reject);
            },
        };
        return query;
    } };
    return { api: loadTs('src/api/productApi.ts', { '../lib/supabase': { supabase } }), calls };
}
const missingColumn = { error: { code: 'PGRST204', message: "Could not find the 'installation_scenes' column in the schema cache" } };

test('read normalization tolerates legacy rows and rejects unsafe image/coordinate data', () => {
    assert.deepEqual(util.normalizeInstallationScenes(undefined), []);
    assert.deepEqual(util.normalizeInstallationScenes({}), []);
    const scenes = fixture();
    scenes[0].hotspots.push({ id: 'bad', product_id: productId, x: Infinity, y: 10, inclusion: 'included' });
    scenes[0].hotspots.push({ ...scenes[0].hotspots[0] });
    const normalized = util.normalizeInstallationScenes([...scenes, { ...scenes[0] }, { id: 'unsafe', image_url: 'javascript:alert(1)', hotspots: [] }]);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].hotspots.length, 1);
    assert.equal(normalized[0].hotspots[0].x, 0);
    assert.equal(normalized[0].hotspots[0].y, 100);
    assert.equal(scenes[0].hotspots.length, 3, 'input not mutated');
});
test('image URLs allow local/HTTP(S), reject protocol tricks and embedded credentials', () => {
    for (const url of ['/photo.jpg', 'https://example.com/a%20b.png', 'http://192.168.1.5/photo.jpg']) assert.equal(util.isSafeSceneImageUrl(url), true, url);
    for (const url of ['//example.com/a', 'javascript:alert(1)', 'data:image/svg+xml,foo', 'https://name:secret@example.com/a', 'https://example.com/a b', '/\\example.com/a']) assert.equal(util.isSafeSceneImageUrl(url), false, url);
});
test('save validation rejects incomplete tags, duplicate IDs and limits without data loss', () => {
    assert.equal(util.getInstallationScenesValidationError(fixture()), null);
    for (const patch of [{ x: -1 }, { y: 101 }, { x: NaN }, { product_id: '' }, { inclusion: 'unknown' }]) {
        const scenes = fixture(); Object.assign(scenes[0].hotspots[0], patch);
        assert.ok(util.getInstallationScenesValidationError(scenes));
    }
    const scenes = fixture(); scenes[0].hotspots.push({ ...scenes[0].hotspots[0] });
    assert.ok(util.getInstallationScenesValidationError(scenes));
    assert.ok(util.getInstallationScenesValidationError(Array.from({ length: 13 }, (_, i) => ({ ...fixture()[0], id: String(i) }))));
    assert.ok(util.getInstallationScenesValidationError([{ ...fixture()[0], caption: 'a'.repeat(201) }]));
    assert.ok(util.getInstallationScenesValidationError([{ ...fixture()[0], hotspots: Array.from({ length: 31 }, (_, i) => ({ ...fixture()[0].hotspots[0], id: String(i) })) }]));
});
test('create and update persist exact image/product coordinates including empty-array clearing', async () => {
    const scenes = fixture();
    const { api, calls } = mockApi([{ data: { id: 'package', installation_scenes: scenes } }, { data: { id: 'package' } }]);
    const result = await api.addProduct({ name: '패키지', price: 0, stock: 1, catalog_type: 'package', installation_scenes: scenes });
    assert.deepEqual(result.installation_scenes, scenes);
    assert.deepEqual(calls[0].insert[0].installation_scenes, scenes);
    await api.updateProduct('package', { installation_scenes: [] });
    assert.deepEqual(calls[1].update.installation_scenes, []);
    assert.deepEqual(calls[1].eq, ['id', 'package']);
});
test('legacy schema can save products without photos; no silent dropping of photos', async () => {
    const legacy = mockApi([missingColumn, { data: { id: 'general' } }]);
    await legacy.api.updateProduct('general', { name: '상품', installation_scenes: [] });
    assert.equal(legacy.calls.length, 2);
    assert.equal(Object.hasOwn(legacy.calls[1].update, 'installation_scenes'), false);
    assert.equal(legacy.calls[1].update.name, '상품');
    const create = mockApi([missingColumn, { data: { id: 'general' } }]);
    await create.api.addProduct({ name: '상품', price: 0, stock: 1, installation_scenes: [] });
    assert.equal(Object.hasOwn(create.calls[1].insert[0], 'installation_scenes'), false);
    for (const method of ['addProduct', 'updateProduct']) {
        const blocked = mockApi([missingColumn]);
        const payload = { name: '패키지', price: 0, stock: 1, installation_scenes: fixture() };
        await assert.rejects(method === 'addProduct' ? blocked.api[method](payload) : blocked.api[method]('package', payload), /add_product_installation_scenes.sql/);
        assert.equal(blocked.calls.length, 1);
        assert.equal(payload.installation_scenes.length, 1);
    }
});
test('invalid writes and unrelated DB failures are not hidden or retried', async () => {
    const invalid = mockApi([]); const scenes = fixture(); scenes[0].hotspots[0].x = 101;
    await assert.rejects(invalid.api.updateProduct('package', { installation_scenes: scenes }));
    assert.equal(invalid.calls.length, 0);
    const failure = { code: '42501', message: 'permission denied' };
    const denied = mockApi([{ error: failure }]);
    await assert.rejects(denied.api.updateProduct('package', { installation_scenes: [] }), error => error === failure);
    assert.equal(denied.calls.length, 1);
});
test('linked product reads deduplicate and batch; missing products do not create fabricated cards', async () => {
    const { api, calls } = mockApi([{ data: [{ id: productId, name: '의자' }] }, { data: [] }]);
    assert.deepEqual(await api.getProductsByIds([]), []);
    const ids = Array.from({ length: 51 }, (_, i) => 'id-' + i);
    const result = await api.getProductsByIds([...ids, ids[0]]);
    assert.equal(calls.length, 2); assert.equal(calls[0].in[1].length, 50); assert.equal(calls[1].in[1].length, 1);
    assert.equal(result.length, 1);
});
test('hero only replaces representative image for packages with usable installation photos', () => {
    const apiStub = { getProductsByIds: async () => [] };
    const { ProductDetailHero } = loadTs('components/products/ProductDetailHero.tsx', { '../../src/api/productApi': apiStub });
    const product = { id: 'package', name: '테스트 패키지', image_url: '/representative.jpg', price: 0, stock: 1, installation_scenes: fixture() };
    const render = value => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(ProductDetailHero, { product: value })));
    assert.match(render({ ...product, catalog_type: 'general' }), /representative.jpg/);
    assert.doesNotMatch(render({ ...product, catalog_type: 'general' }), /pig-gallery/);
    assert.match(render({ ...product, catalog_type: 'package' }), /pig-gallery/);
    assert.match(render({ ...product, catalog_type: 'package' }), /사진 속 렌탈 상품/);
    assert.match(render({ ...product, catalog_type: 'package', installation_scenes: [] }), /representative.jpg/);
});


test('package redesign shows real selected quantities and leaves long original detail collapsed', () => {
    const sections = loadTs('components/products/PackageDetailSections.tsx', { '../../src/api/productApi': { getProductsByIds: async () => [] } });
    const product = { name: '모듈형 오피스 패키지', price: 0, stock: 1, basic_components: [
        { name: '책상', quantity: 6 }, { name: '의자', quantity: 6 },
    ] };
    const header = renderToStaticMarkup(React.createElement(sections.PackageDetailHeader, { product, onCustomize() {} }));
    assert.match(header, /모듈형 오피스 패키지/);
    assert.match(header, /2종의 상품/);
    assert.doesNotMatch(header, /20인|추천 인원/);
    const overview = renderToStaticMarkup(React.createElement(sections.PackageCompositionOverview, {
        product, componentProducts: [], quantities: { '책상': 4, '의자': 0 }, onCustomize() {},
    }));
    assert.match(overview, /4개/); assert.match(overview, /기본 6개/); assert.match(overview, /선택 제외/);
    const original = renderToStaticMarkup(React.createElement(sections.PackageOriginalDetails, { description: '<img src="/legacy-poster.jpg" alt="상세 사양" />' }));
    assert.match(original, /<details/); assert.doesNotMatch(original, /<details[^>]* open/); assert.match(original, /legacy-poster.jpg/);
});

test('package combination quantity controls render independently of desktop quote sidebar', () => {
    const sections = loadTs('components/products/PackageDetailSections.tsx', { '../../src/api/productApi': { getProductsByIds: async () => [] } });
    const markup = renderToStaticMarkup(React.createElement(sections.PackageCombinationControls, {
        combinations: [{ id: 'desk', selections: { 종류: '책상', 색상: '화이트' }, quantity: 3 }], drafts: {},
        onUpdate() {}, onInput() {}, onBlur() {},
    }));
    assert.ok(markup.includes('책상 / 화이트 수량 늘리기'));
    assert.ok(markup.includes('책상 / 화이트 선택 제외'));
    assert.match(markup, /value="3"/);
    assert.doesNotMatch(markup, /pkd-sidebar/);
});
