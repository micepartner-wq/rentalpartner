const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = ts.transpileModule(fs.readFileSync(path.resolve(root, 'src/utils/watermark.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', source)(require, mod, mod.exports);
const { getWatermarkLayout, watermarkImage } = mod.exports;

test('로고는 우측 하단 안쪽에 놓인다', () => {
    const l = getWatermarkLayout(1200, 800, 540 / 114);
    assert.ok(l.plateX + l.plateWidth < 1200 && l.plateY + l.plateHeight < 800);
    assert.ok(l.plateX > 600 && l.plateY > 400);
    assert.equal(l.logoWidth, Math.round(1200 * 0.16));
});

test('아주 작은 이미지에서도 로고가 최소 크기를 유지하고 화면 안에 있다', () => {
    const l = getWatermarkLayout(400, 300, 540 / 114);
    assert.ok(l.logoWidth >= 72);
    assert.ok(l.plateX >= 0 && l.plateY >= 0);
});

test('지원하지 않는 형식(GIF/SVG)은 원본 그대로 돌려준다', async () => {
    const file = { type: 'image/gif', name: 'a.gif' };
    assert.equal(await watermarkImage(file), file);
});
