const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loadTs(relativePath) {
    const source = ts.transpileModule(fs.readFileSync(path.resolve(root, relativePath), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', source)(require, module, module.exports);
    return module.exports;
}

const { evaluateProductQuality: evaluate, summarizeQuality: summarize } = loadTs('src/utils/productQuality.ts');
const keys = (result) => result.issues.map((issue) => issue.key).sort();
const complete = {
    name: '상품', price: 0, stock: 1, category_id: 'c1', image_url: 'https://e.com/a.jpg',
    short_description: '화이트 1200 사무용 테이블입니다.',
    description: '<p>규격 1200x600mm, 화이트 상판, 철제 프레임으로 구성된 사무용 책상입니다.</p><img src="x.jpg">',
    gallery_images: [{ id: 'g1' }], installation_cases: [{ id: 'i1' }],
};

test('모든 항목이 채워진 일반 상품은 100점이다', () => {
    const result = evaluate(complete);
    assert.deepEqual(keys(result), []);
    assert.equal(result.score, 100);
    assert.equal(result.hasRequiredIssue, false);
});

test('텅 빈 일반 상품은 필수 항목이 모두 지적되고 점수가 낮다', () => {
    const result = evaluate({ name: 'x', price: 0, stock: 1 });
    assert.deepEqual(keys(result), ['category', 'detail', 'gallery', 'image', 'summary', 'topImages']);
    assert.equal(result.hasRequiredIssue, true);
    assert.equal(result.score, 100 - 25 - 20 - 20 - 8 - 6 - 6);
});

test('상세 설명이 이미지뿐이면 없음이 아니라 "글이 없음" 권장 항목으로 본다', () => {
    const imageOnly = evaluate({ ...complete, description: '<img src="a.jpg"><img src="b.jpg">' });
    assert.deepEqual(keys(imageOnly), ['detailText']);
    assert.equal(imageOnly.hasRequiredIssue, false);
    const empty = evaluate({ ...complete, description: '<p>&nbsp;</p>' });
    assert.deepEqual(keys(empty), ['detail']);
    assert.equal(empty.hasRequiredIssue, true);
});

test('공백뿐인 한 줄 소개는 비어 있는 것으로 본다', () => {
    assert.deepEqual(keys(evaluate({ ...complete, short_description: '  <br> ' })), ['summary']);
});

test('패키지는 설치사진과 구성품을 필수로 본다', () => {
    const pkg = { name: 'p', price: 0, stock: 1, catalog_type: 'package', category_id: 'c1', image_url: 'https://e.com/a.jpg', short_description: '소개' };
    const missing = evaluate(pkg);
    assert.deepEqual(keys(missing), ['components', 'scenes']);
    assert.equal(missing.score, 100 - 25 - 20);
    const ok = evaluate({ ...pkg, installation_scenes: [{ id: 's' }], basic_components: [{ name: 'a', quantity: 1 }] });
    assert.equal(ok.score, 100);
    assert.equal(ok.kind, 'package');
});

test('요약은 완성·필수 누락 개수와 항목별 개수를 센다', () => {
    const items = [evaluate(complete), evaluate({ ...complete, short_description: '' }), evaluate({ ...complete, gallery_images: [] })];
    const summary = summarize(items);
    assert.equal(summary.total, 3);
    assert.equal(summary.complete, 1);
    assert.equal(summary.needsRequired, 1);
    assert.equal(summary.issueCounts.summary.count, 1);
    assert.equal(summary.issueCounts.gallery.count, 1);
    assert.equal(summarize([]).averageScore, 0);
});
