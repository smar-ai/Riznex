const fs = require('fs');
const pdf = require('pdf-parse');

async function parseBankStatementPdf() {
  const filePath = 'E:/Sales Software/restaurant-dashboard/public/uploads/client-1/1786925073392-Walkin_Card_May.pdf';
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  
  console.log('=== BANK STATEMENT PDF NUMBER OF PAGES ===', data.numpages);
  console.log('=== BANK STATEMENT PDF FULL TEXT CONTENT ===');
  console.log(data.text);
}

parseBankStatementPdf();
