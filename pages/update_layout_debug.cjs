const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace \r\n with \n for consistent searching
content = content.replace(/\r\n/g, '\n');

const startIndex = content.indexOf('          {/* 2-Column Layout */}');
const endMarker = '        </Container>\n      </div>\n\n      <div\n        className={`fixed bottom-0 left-0 right-0';
const endIndex = content.indexOf(endMarker);

if (startIndex === -1) {
  console.error('Could not find start index.');
  process.exit(1);
}
if (endIndex === -1) {
  console.error('Could not find end index.');
  // Let's print out the content around where we expect the end to be
  const containerEnd = content.indexOf('        </Container>\n      </div>');
  console.log('Found Container end at', containerEnd);
  console.log(content.substring(containerEnd, containerEnd + 200));
  process.exit(1);
}

// ... rest of the code ...
