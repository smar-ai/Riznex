const http = require('http');

async function testApi() {
  console.log("Fetching POS...");
  const res1 = await fetch('http://localhost:3000/api/sales?platform=Herbies%20Pizza%20POS&clientId=cmpv4dvik0000vdj089wl6zmf');
  const posSales = await res1.json();
  
  console.log("Fetching Website...");
  const res2 = await fetch('http://localhost:3000/api/sales?platform=Herbies%20Pizza%20Website&clientId=cmpv4dvik0000vdj089wl6zmf');
  const webSales = await res2.json();

  console.log("POS Sales Length:", posSales.length);
  if(posSales.length > 0) console.log("POS Sample Gross:", posSales[0].grossSales);

  console.log("Web Sales Length:", webSales.length);
  if(webSales.length > 0) console.log("Web Sample Gross:", webSales[0].grossSales);
}

testApi().catch(console.error);
