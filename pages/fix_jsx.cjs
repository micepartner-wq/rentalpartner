const fs = require('fs');
let lines = fs.readFileSync('pages/ProductDetail.tsx', 'utf8').split('\n');

function fixLine(lineNum, newContent) {
  const idx = lineNum - 1;
  if (idx >= 0 && idx < lines.length) {
    const hadCR = lines[idx].endsWith('\r');
    lines[idx] = newContent + (hadCR ? '\r' : '');
  }
}

// 1. Line 1451: Unexpected closing "div" tag does not match opening "h3" tag
// Let's look at lines around 1450-1460 to see what the actual issue is.
// Actually, earlier I added `</span>` after "기본 구성" which was at line 1465.
// Let's just fix the file manually using regex or specific line replacements.
