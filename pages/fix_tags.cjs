const fs = require('fs');
const lines = fs.readFileSync('pages/ProductDetail.tsx', 'utf8').split('\n');

// Fix line 1224: missing </a> tag  
lines[1223] = '                    홈\r';
lines.splice(1224, 0, '                    </a>\r');

// After splice, line numbers shift by 1
// Fix line 1375 (was 1374): missing </button> - should be </button> not </div>
// Fix line 1403 (was 1402): missing </div>  
// Fix line 1469 (was 1468): missing </span>
// Fix line 1536 (was 1535): should be </span> not </div>

// Re-read to get accurate line numbers after splice
let txt = lines.join('\n');

// Fix: </div> should be </button> around the reset button area
txt = txt.replace(
  /(<RotateCcw size=\{14\} \/>)\s*\n\s*일정 초기화\s*\n\s*<\/div>/,
  '$1\n                    일정 초기화\n                  </button>'
);

// Fix: span not closed properly in rental period area - the </div> after ({days}일)</span> 
// Actually need to see more context for proper fix

// Fix: {item.quantity}개 followed by </div> should be </span>
txt = txt.replace(
  /\{item\.quantity\}개\s*\n\s*<\/div>/,
  '{item.quantity}개\n                              </span>'
);

fs.writeFileSync('pages/ProductDetail.tsx', txt, 'utf8');
console.log('Fixed JSX tag issues');
