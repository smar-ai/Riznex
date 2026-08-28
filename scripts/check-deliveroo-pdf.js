const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function run() {
  const fullPath = path.join(process.cwd(), 'public', 'uploads', 'cmpv4dvik0000vdj089wl6zmf', '1784585750164-Tasty_Bun_Deliveroo_July_12.pdf');
  if (fs.existsSync(fullPath)) {
    const dataBuffer = fs.readFileSync(fullPath);
    const pdfData = await pdfParse(dataBuffer);
    console.log(pdfData.text);
  } else {
    console.log("Not found:", fullPath);
  }
}

run().catch(console.error);
