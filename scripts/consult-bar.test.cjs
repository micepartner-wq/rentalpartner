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

const { getBusinessStatus } = loadTs('src/utils/businessHours.ts');
const { isConsultBarRoute, toTelHref } = loadTs('src/utils/consultBar.ts');
// 한국 시간(KST = UTC+9)으로 적은 시각을 Date 로 만든다.
const kst = (iso) => new Date(iso + '+09:00');

test('평일 운영시간(09~12, 13~18시)에는 상담 가능으로 표시한다', () => {
    for (const time of ['2026-11-23T09:00:00', '2026-11-23T11:59:00', '2026-11-23T13:00:00', '2026-11-27T17:59:00']) {
        const status = getBusinessStatus(kst(time));
        assert.equal(status.open, true, time);
        assert.equal(status.state, 'open');
    }
});

test('점심시간·운영 전후·주말에는 상담 불가로 표시하고 카톡·견적으로 안내한다', () => {
    assert.equal(getBusinessStatus(kst('2026-11-23T12:00:00')).state, 'lunch');
    assert.equal(getBusinessStatus(kst('2026-11-23T12:59:00')).state, 'lunch');
    assert.equal(getBusinessStatus(kst('2026-11-23T08:59:00')).state, 'before');
    assert.equal(getBusinessStatus(kst('2026-11-23T18:00:00')).state, 'after');
    assert.equal(getBusinessStatus(kst('2026-11-23T23:30:00')).state, 'after');
    assert.equal(getBusinessStatus(kst('2026-11-23T00:10:00')).state, 'before');
    for (const day of ['2026-11-21T11:00:00', '2026-11-22T11:00:00']) {
        const status = getBusinessStatus(kst(day));
        assert.equal(status.state, 'weekend');
        assert.equal(status.open, false);
        assert.match(status.label, /카톡/);
    }
});

test('접속한 기기의 시간대가 달라도 한국 시간 기준으로 계산한다', () => {
    // 같은 순간: UTC 01:00 = 한국 월요일 10:00 (상담 가능), UTC 일요일 16:00 = 한국 월요일 01:00 (운영 전)
    assert.equal(getBusinessStatus(new Date('2026-11-23T01:00:00Z')).open, true);
    assert.equal(getBusinessStatus(new Date('2026-11-22T16:00:00Z')).state, 'before');
});

test('이미 하단 고정 요소가 있는 화면에서는 하단 상담 바를 숨긴다', () => {
    for (const hidden of ['/quote-cart', '/quote-request', '/login', '/signup', '/review/new', '/review/abc/edit',
        '/products/87d891d2-130e-4c2c-ade6-f6ce54945250', '/p/ABC123']) {
        assert.equal(isConsultBarRoute(hidden), false, hidden);
    }
    for (const shown of ['/', '/products', '/products/사무가구', '/products/사무가구/desk-table', '/review', '/review/abc', '/cs', '/notice']) {
        assert.equal(isConsultBarRoute(shown), true, shown);
    }
});

test('전화번호에서 tel 링크를 만든다', () => {
    assert.equal(toTelHref('1800-1985'), 'tel:18001985');
    assert.equal(toTelHref('+82 42-123-4567'), 'tel:+82421234567');
});
