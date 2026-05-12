const https = require('https');

https.get('https://humanpartner-mall.web.app/', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const scripts = d.match(/src="[^"]*\.js"/g);
    if (scripts) scripts.forEach(s => console.log(s));
    const css = d.match(/href="[^"]*\.css"/g);
    if (css) css.forEach(s => console.log(s));
  });
}).on('error', e => console.error(e.message));
