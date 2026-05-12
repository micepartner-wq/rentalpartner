/**
 * Restore ProductDetail.tsx by reading lines, finding corrupted Korean
 * by surrounding ASCII context, and replacing with correct text from
 * the deployed production bundle.
 * 
 * Method: Each fix specifies a unique ASCII context pattern that appears
 * on the same line as the corrupted Korean, plus the correct replacement.
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'ProductDetail.tsx');
const backupFile = sourceFile + '.encoding-backup';

// Read raw and save backup
const rawBuf = fs.readFileSync(sourceFile);
if (!fs.existsSync(backupFile)) {
  fs.writeFileSync(backupFile, rawBuf);
  console.log(`Backup saved: ${backupFile}`);
}

// Read as UTF-8 
let content = rawBuf.toString('utf8');
let lines = content.split(/\r?\n/);
console.log(`Total lines: ${lines.length}`);

// ============================================================
// Each fix: [asciiAnchor, fullReplacementLine]
// asciiAnchor: unique ASCII substring to find the corrupted line
// fullReplacementLine: the complete correct line
// ============================================================

const fixes = [
  // --- getComponentComponentImage function ---
  ['comp-notebook.svg', '  if (name.includes("노트북")) return "/comp-notebook.svg";'],
  ['comp-table.svg', '  if (name.includes("테이블")) return "/comp-table.svg";'],
  ['comp-chair.svg', '  if (name.includes("의자")) return "/comp-chair.svg";'],
  ['comp-printer.svg', '  if (name.includes("복합기") || name.includes("프린터")) return "/comp-printer.svg";'],
  ['comp-fridge.svg', '  if (name.includes("냉장고")) return "/comp-fridge.svg";'],
  ['comp-coffee.svg', '  if (name.includes("커피머신")) return "/comp-coffee.svg";'],
  
  // --- SelectedOptionsSection: "수량 선택" ---
  ['text-xs font-semibold text-gray-500 mb-2', '    <p className="text-xs font-semibold text-gray-500 mb-2">수량 선택</p>'],
  
  // --- getQuantityUnit ---
  ['getQuantityUnit', 'const getQuantityUnit = () => "개";'],
];

// Apply line-replacement fixes
let fixCount = 0;
for (const [anchor, replacement] of fixes) {
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(anchor)) {
      // Verify this line actually has corruption
      const hasCorruption = lines[i].match(/[\x80-\xFF]|[\uFFFD]|\?\?/);
      if (hasCorruption || lines[i] !== replacement) {
        lines[i] = replacement;
        fixCount++;
        found = true;
        console.log(`✓ Fixed line ${i+1}: ${anchor}`);
      }
      break;
    }
  }
  if (!found) console.log(`✗ Not found: ${anchor}`);
}

// ============================================================
// Contextual substring replacements
// [searchContext, corruptedSubstring, correctSubstring]
// These replace a substring within a line that contains the searchContext
// ============================================================

// For these, we need a different approach since the corrupted bytes
// don't match simple string patterns. Instead, we'll replace everything
// between known ASCII boundaries.

// Let me try a different approach: for each corrupted line,
// identify the line by its non-Korean ASCII content and replace
// the entire line.

// Collect all lines that have non-ASCII non-Korean content (corruption indicators)
console.log('\n=== Scanning for remaining corrupted lines ===');

const isCorruptedKorean = (str) => {
  // Check for: replacement char, consecutive ?, or bytes in 0x80-0xFF range
  // that don't form valid UTF-8 Korean syllables
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Unicode replacement character
    if (code === 0xFFFD) return true;
    // Check for sequences of ? mixed with high bytes
    if (str[i] === '?' && i + 1 < str.length && str[i+1] === '?') {
      // Two or more consecutive ? might be corrupted
      if (i + 2 < str.length && str.charCodeAt(i+2) > 0x7F) return true;
    }
  }
  // Check for EUC-KR encoded bytes that show up as Latin chars
  if (str.match(/[\xB0-\xC8][\xA1-\xFE]/)) return true;
  return false;
};

// More practical: find lines where bundle text differs from source text
// by comparing the pure ASCII structure

// Actually, the most reliable approach: write a comprehensive map of
// ALL Korean strings from the bundle, keyed by their surrounding code.

// From the bundle, here are all Korean string literals with context:
const bundleStrings = [
  // Each: [preceding_code_context, korean_text, following_code_context]
  ['includes("', '노트북', '")'],
  ['includes("', '테이블', '")'],
  ['includes("', '의자', '")'],
  ['includes("', '복합기', '")'],
  ['includes("', '프린터', '")'],
  ['includes("', '냉장고', '")'],
  ['includes("', '커피머신', '")'],
  ['"text-xs font-semibold text-gray-500 mb-2",children:"', '수량 선택', '"'],
  ['"', '개', '"'],  // getQuantityUnit
  // From the bundle main component:
  ['children:"', '해당 카테고리에 등록된 상품이 없습니다.', '"'],
  ['children:"', '선택된 카테고리에 상품이 없습니다.', '"'],
  ['children:"', '옵션별 수량을 바로 선택해서 같은 상품 안에 함께 담을 수 있습니다.', '"'],
  ['children:"', '각 그룹에서 옵션값을 하나씩 골라 한 세트로 담습니다.', '"'],
  ['children:"', '단일 선택', '"'],
  ['"', '선택 옵션', '"'],  // 선택 옵션 label
  ['"', '세트 수량', '"'],
  ['children:"', '선택한 옵션 조합으로 담을 책상 수량입니다.', '"'],
  ['"aria-label":"', '세트 수량 줄이기', '"'],
  ['"aria-label":"', '세트 수량 늘리기', '"'],
  // ... etc.
];

// This is getting very complex. Let me take the MOST PRACTICAL approach:
// 
// 1. The deployed bundle has the EXACT same code structure
// 2. I'll extract ALL string literals from the bundle 
// 3. Match them to the source by position/context
//
// But actually, there's an even simpler approach:
// The source file's CODE STRUCTURE (imports, JSX, CSS classes) is fine.
// Only KOREAN TEXT is corrupted.
// I have the COMPLETE list of Korean texts from the bundle.
// I can write a comprehensive line-by-line fix script.

// Let me just output the current line numbers of all corrupted lines
// with their full content, so I can map them manually.

const corrupted = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Detect corruption: non-ASCII bytes that aren't valid Korean syllables (U+AC00-U+D7AF)
  // or aren't common CJK/symbols
  let hasCorruption = false;
  for (let j = 0; j < line.length; j++) {
    const code = line.charCodeAt(j);
    // Skip normal ASCII
    if (code <= 0x7F) continue;
    // Skip valid Korean syllables (AC00-D7AF)
    if (code >= 0xAC00 && code <= 0xD7AF) continue;
    // Skip Korean Jamo (1100-11FF, 3130-318F)
    if ((code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F)) continue;
    // Skip common CJK compatibility (3000-303F)
    if (code >= 0x3000 && code <= 0x303F) continue;
    // Skip common punctuation and symbols
    if (code >= 0x2000 && code <= 0x27FF) continue;
    // Skip emoji
    if (code >= 0x1F000) continue;
    // Everything else is suspicious
    if (code >= 0x80 && code < 0xAC00) {
      hasCorruption = true;
      break;
    }
    if (code >= 0xD800 && code <= 0xDFFF) { // surrogates
      hasCorruption = true;
      break;
    }
    if (code === 0xFFFD) { // replacement char
      hasCorruption = true;
      break;
    }
  }
  
  // Also check for patterns like "??" followed by Korean or high bytes
  if (!hasCorruption && line.match(/\?\?[\u0080-\uFFFF]/)) {
    hasCorruption = true;
  }
  if (!hasCorruption && line.match(/[\u0080-\u00FF]{2,}/)) {
    hasCorruption = true;
  }
  
  if (hasCorruption) {
    corrupted.push(i + 1);
  }
}

console.log(`\nCorrupted lines (${corrupted.length} total): ${corrupted.join(', ')}`);

// Write partial fixes
const output = lines.join('\r\n');
fs.writeFileSync(sourceFile, output, 'utf8');
console.log(`\nFile written with ${fixCount} fixes applied.`);
console.log('Next step: need to fix remaining corrupted lines manually.');
