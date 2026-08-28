const fs = require('fs');
const pdfParse = require('pdf-parse');

async function main() {
  const filePath = 'E:/Graphic Designing/Hungry Birds/Invoices/05 5th May.pdf';
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    console.log("=== EXACT TEXT FROM PDF ===");
    console.log(data.text);
    console.log("===========================");
  } catch (err) {
    console.error("Error parsing PDF:", err);
  }
}

main();
