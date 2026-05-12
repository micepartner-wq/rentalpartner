const https = require('https');

// Check if sourcemap exists
const jsUrl = 'https://humanpartner-mall.web.app/assets/index-H67ZO05e.js.map';
console.log('Checking:', jsUrl);

https.get(jsUrl, (res) => {
  console.log('Status:', res.statusCode);
  if (res.statusCode === 200) {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Sourcemap size:', d.length);
      // Parse and extract ProductDetail source
      try {
        const map = JSON.parse(d);
        console.log('Sources count:', map.sources?.length);
        const pdIdx = map.sources?.findIndex(s => s.includes('ProductDetail'));
        if (pdIdx >= 0) {
          console.log('Found ProductDetail at index:', pdIdx);
          console.log('Source name:', map.sources[pdIdx]);
          const content = map.sourcesContent?.[pdIdx];
          if (content) {
            const fs = require('fs');
            fs.writeFileSync('pages/ProductDetail.recovered.tsx', content, 'utf8');
            console.log('RECOVERED! Written to ProductDetail.recovered.tsx, size:', content.length);
          } else {
            console.log('No sourcesContent available');
          }
        } else {
          console.log('ProductDetail not found in sources');
          // Show first few source names
          map.sources?.slice(0, 20).forEach((s, i) => console.log(i, s));
        }
      } catch(e) {
        console.error('Parse error:', e.message);
      }
    });
  } else {
    console.log('No sourcemap available, trying without .map...');
    // Try to get the JS bundle and search for ProductDetail strings
  }
}).on('error', e => console.error(e.message));
