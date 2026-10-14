const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// Compile the actual TS modules; external modules are mocked so nothing touches a real database.
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

const cases = loadTs('src/utils/installationCases.ts');
const photo = (id, extra = {}) => ({ id, image_url: `https://example.com/${id}.jpg`, caption: '', ...extra });

test('최대 6장까지 허용하고 7장째는 거부한다', () => {
    const six = Array.from({ length: 6 }, (_, i) => photo('p' + i));
    assert.equal(cases.getInstallationCasesValidationError(six), null);
    assert.match(cases.getInstallationCasesValidationError([...six, photo('p6')]), /최대 6장/);
});

test('안전하지 않은 주소, 중복 id, 긴 설명을 거부한다', () => {
    assert.match(cases.getInstallationCasesValidationError([photo('a', { image_url: 'javascript:alert(1)' })]), /이미지 주소/);
    assert.match(cases.getInstallationCasesValidationError([photo('a'), photo('a')]), /다시 확인/);
    assert.match(cases.getInstallationCasesValidationError([photo('a', { caption: 'x'.repeat(201) })]), /200자/);
});

test('읽기 정규화는 깨진 항목을 건너뛰고 6장으로 자른다', () => {
    const raw = [photo('a'), { id: 'b', image_url: 'bad url' }, null, photo('a'), ...Array.from({ length: 8 }, (_, i) => photo('x' + i))];
    const result = cases.normalizeInstallationCases(raw);
    assert.equal(result.length, 6);
    assert.deepEqual(result.map(c => c.id).slice(0, 2), ['a', 'x0']);
    assert.deepEqual(cases.normalizeInstallationCases('nope'), []);
});

test('컬럼이 없는 DB 오류만 구 DB 호환 대상으로 판단한다', () => {
    assert.equal(cases.isMissingInstallationCasesError({ code: 'PGRST204', message: "Could not find the 'installation_cases' column" }), true);
    assert.equal(cases.isMissingInstallationCasesError({ code: '42703', message: 'column products.installation_cases does not exist' }), true);
    assert.equal(cases.isMissingInstallationCasesError({ code: '23505', message: 'duplicate key' }), false);
    assert.equal(cases.isMissingInstallationCasesError({ code: '42703', message: 'column products.other does not exist' }), false);
});

test('패키지의 +태그에서 이 상품이 연결된 패키지를 자동으로 찾는다', () => {
    const mocks = {
        '../../src/api/productApi': { getProducts: async () => [] },
        'react': { useEffect() {}, useMemo: fn => fn(), useState: v => [v, () => {}] },
        'react-router-dom': { Link: () => null },
        'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    };
    const { findPackagesContainingProduct } = loadTs('components/products/ProductInstallationCases.tsx', mocks);
    const scene = hotspotProductIds => ({ id: 's' + hotspotProductIds.join(''), image_url: 'https://example.com/s.jpg', caption: '',
        hotspots: hotspotProductIds.map((pid, i) => ({ id: 'h' + i + pid, product_id: pid, x: 10, y: 10, inclusion: 'included' })) });
    const pkg = (id, ids, extra = {}) => ({ id, name: id, price: 0, stock: 1, catalog_type: 'package', installation_scenes: [scene(ids)], ...extra });
    const list = [
        pkg('pkg-a', ['monitor', 'chair']),
        pkg('pkg-b', ['desk']),
        pkg('pkg-c', ['chair']),
        { id: 'general-x', name: 'g', price: 0, stock: 1, catalog_type: 'general', installation_scenes: [scene(['chair'])] },
        { id: 'pkg-d', name: 'd', price: 0, stock: 1, catalog_type: 'package' },
    ];
    assert.deepEqual(findPackagesContainingProduct(list, 'chair').map(p => p.id), ['pkg-a', 'pkg-c']);
    assert.deepEqual(findPackagesContainingProduct(list, 'monitor').map(p => p.id), ['pkg-a']);
    assert.deepEqual(findPackagesContainingProduct(list, 'unknown'), []);
});
