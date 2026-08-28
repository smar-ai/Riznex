const http = require('http');

http.get('http://localhost:3000/api/reports?clientId=cmpv4dvik0000vdj089wl6zmf&store=Herbies%20Pizza&from=2026-08-01&to=2026-08-31', (res) => {
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(raw);
      console.log('\n=== HERBIES PIZZA AUGUST PLATFORM BREAKDOWN ===\n');
      console.log(JSON.stringify(data.sales.platformBreakdown, null, 2));
    } catch (e) {
      console.error(e);
      console.log(raw.slice(0, 500));
    }
  });
});
