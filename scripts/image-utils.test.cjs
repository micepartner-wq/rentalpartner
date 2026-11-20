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

const { normalizeDescriptionImageAlignment: normalize, applyImageAlignment, applyImageSize } = loadTs('src/utils/descriptionHtml.ts');
const { isPlainBackgroundImage: isPlain } = loadTs('src/utils/imageBackground.ts');

test('가운데·오른쪽·왼쪽 정렬이 이미지에 실제로 적용된다', () => {
    const center = normalize('<img src="a.jpg" style="text-align: center;">');
    assert.match(center, /display:block/);
    assert.match(center, /margin-left:auto;margin-right:auto/);
    assert.doesNotMatch(center, /text-align/);
    assert.match(normalize('<img src="a.jpg" style="text-align:right">'), /margin-left:auto;margin-right:0/);
    assert.match(normalize("<img src='a.jpg' style='text-align: left;'>"), /margin-left:0;margin-right:auto/);
});

test('기존 스타일 값은 보존하고, 지정된 폭은 덮어쓰지 않는다', () => {
    const out = normalize('<img src="a.jpg" style="text-align: center; --tw-ring-inset: 0; width: 320px;">');
    assert.match(out, /--tw-ring-inset: 0/);
    assert.match(out, /width: 320px/);
    assert.doesNotMatch(out, /width:auto/);
    assert.match(normalize('<img src="a.jpg" style="text-align:center">'), /width:auto/);
    assert.doesNotMatch(normalize('<img src="a.jpg" width="200" style="text-align:center">'), /width:auto/);
});

test('정렬 스타일이 없는 이미지와 다른 태그는 그대로 둔다', () => {
    const html = '<p style="text-align:center">글</p><img src="a.jpg"><img src="b.jpg" style="border-radius:8px">';
    assert.equal(normalize(html), html);
    assert.equal(normalize(''), '');
});

test('편집기에서 이미지를 선택해 정렬하면 블록·여백이 설정된다', () => {
    const style = {};
    const image = { style, getAttribute: () => null };
    applyImageAlignment(image, 'center');
    assert.deepEqual([style.display, style.marginLeft, style.marginRight, style.maxWidth], ['block', 'auto', 'auto', '100%']);
    applyImageAlignment(image, 'right');
    assert.deepEqual([style.marginLeft, style.marginRight], ['auto', '0']);
    applyImageAlignment(image, 'left');
    assert.deepEqual([style.marginLeft, style.marginRight], ['0', 'auto']);
});

test('이미지 크기를 비율로 정하면 블록이 되고, 정렬이 없으면 왼쪽으로 둔다', () => {
    const style = {};
    const image = { style, getAttribute: () => null };
    applyImageSize(image, 50);
    assert.deepEqual([style.display, style.width, style.maxWidth, style.marginLeft, style.marginRight], ['block', '50%', '100%', '0', 'auto']);
    // 이미 가운데 정렬된 이미지는 정렬을 유지한 채 크기만 바뀐다.
    applyImageAlignment(image, 'center');
    applyImageSize(image, 75);
    assert.deepEqual([style.width, style.marginLeft, style.marginRight], ['75%', 'auto', 'auto']);
});

const SIZE = 40;
const make = (pixel) => {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
        const [r, g, b, a] = pixel(x, y);
        data.set([r, g, b, a], (y * SIZE + x) * 4);
    }
    return data;
};
const isBorder = (x, y) => x < 2 || y < 2 || x >= SIZE - 2 || y >= SIZE - 2;

test('흰색·투명·밝은 회색 배경의 제품컷은 배경 없는 이미지로 판단한다', () => {
    assert.equal(isPlain(make(() => [255, 255, 255, 255])), true);
    assert.equal(isPlain(make((x, y) => isBorder(x, y) ? [0, 0, 0, 0] : [90, 60, 40, 255])), true);
    assert.equal(isPlain(make((x, y) => isBorder(x, y) ? [243, 243, 243, 255] : [30, 30, 30, 255])), true);
});

test('공간·연출 사진은 배경이 있는 사진으로 판단한다', () => {
    // 테두리 색이 제각각인 사진
    assert.equal(isPlain(make((x, y) => [(x * 37 + y * 11) % 256, (x * 13 + y * 53) % 256, (x * 7 + y * 29) % 256, 255])), false);
    // 위는 벽(흰색), 아래는 바닥(나무색): 테두리의 절반이 다른 색
    assert.equal(isPlain(make((x, y) => y < SIZE / 2 ? [250, 250, 250, 255] : [150, 105, 70, 255])), false);
    // 어두운 단색 배경은 제품컷으로 보지 않는다
    assert.equal(isPlain(make(() => [20, 20, 20, 255])), false);
});

test('테두리 일부(10% 이내)만 달라도 제품컷으로 본다', () => {
    const data = make((x, y) => isBorder(x, y) && x === 0 && y < 10 ? [20, 40, 160, 255] : [255, 255, 255, 255]);
    assert.equal(isPlain(data), true);
});
