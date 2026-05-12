const fs = require('fs');

// Read the built JS - it has all the correct Korean strings
const builtJs = fs.readFileSync('dist/assets/ProductDetail-CAHcGiG4.js', 'utf8');

// Extract all Korean string literals from the built JS
const koreanStrings = [];
const regex = /["'`]([^"'`]*[가-힣]+[^"'`]*)["'`]/g;
let match;
while ((match = regex.exec(builtJs)) !== null) {
  const str = match[1];
  if (str.length > 1 && str.length < 200) {
    koreanStrings.push(str);
  }
}

console.log('Found', koreanStrings.length, 'Korean strings in built JS');
koreanStrings.forEach((s, i) => console.log(i + ':', s.substring(0, 80)));
