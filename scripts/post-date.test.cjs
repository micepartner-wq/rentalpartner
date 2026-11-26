const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = ts.transpileModule(
    fs.readFileSync(path.resolve(__dirname, '..', 'src/utils/postDate.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', source)(require, mod, mod.exports);
const { toDateInputValue, fromDateInputValue, todayDateInputValue } = mod.exports;

test('날짜를 저장하면 한국 시간 정오로 바뀌고 같은 날짜로 되돌아온다', () => {
    const iso = fromDateInputValue('2026-11-10');
    assert.equal(iso, '2026-11-10T03:00:00.000Z');
    assert.equal(toDateInputValue(iso), '2026-11-10');
});

test('UTC 기준 전날로 넘어가는 시각도 한국 날짜로 보여 준다', () => {
    assert.equal(toDateInputValue('2026-11-09T16:00:00.000Z'), '2026-11-10');
});

test('잘못된 날짜 형식은 거부한다', () => {
    assert.equal(fromDateInputValue(''), null);
    assert.equal(fromDateInputValue('2026/11/10'), null);
    assert.equal(fromDateInputValue('2026-13-40'), null);
    assert.equal(toDateInputValue('nope'), '');
    assert.equal(toDateInputValue(undefined), '');
});

test('오늘 날짜는 한국 시간 기준이다', () => {
    assert.equal(todayDateInputValue(new Date('2026-11-25T16:30:00.000Z')), '2026-11-26');
});
