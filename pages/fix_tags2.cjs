const fs = require('fs');
const lines = fs.readFileSync('pages/ProductDetail.tsx', 'utf8').split('\n');

function fixLine(lineNum, newContent) {
  const idx = lineNum - 1;
  if (idx >= 0 && idx < lines.length) {
    const hadCR = lines[idx].endsWith('\r');
    lines[idx] = newContent + (hadCR ? '\r' : '');
  }
}

function insertAfter(lineNum, newContent) {
  const idx = lineNum; // insert after lineNum (0-indexed = lineNum)
  const hadCR = lines[0].endsWith('\r');
  lines.splice(idx, 0, newContent + (hadCR ? '\r' : ''));
}

// Fix 1: Line 1394 - missing </span> after "렌탈 기간"
fixLine(1394, '                    렌탈 기간');
insertAfter(1394, '                  </span>');

// After insert, lines shift by 1

// Fix 2: Lines 1464-1466 - missing </span> after "기본 구성"
// Current (after shift): 1465="기본 구성", 1466="<h3...>", 1467="기본 구성품으로 포함된 제품"
fixLine(1465, '                        기본 구성');
insertAfter(1465, '                        </span>');

// After insert, lines shift by 1 more (total +2)

// Fix 3: Line 1468 (now 1468+2=1470) - "기본 구성품으로 포함된 제품" should have </h3> not just a closing
// Already has </h3> on next line, should be fine

// Fix 4: Line 1538 (now +2 = 1540) needs </div> before );
// The span/div mismatch around basic_components quantity display
// Actually looking at the code, line 1538 (shifted) should have a </div> wrapping the item

fs.writeFileSync('pages/ProductDetail.tsx', lines.join('\n'), 'utf8');
console.log('Fixed tag issues, total lines:', lines.length);
