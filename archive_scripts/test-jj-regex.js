const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseSupplierInvoice(text) {
  const result = {};

  const invoiceDateSlash = text.match(/Invoice\s*Date[\s\S]{0,60}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const deliveryDateSlash = text.match(/Delivery\s*Date[\s:]+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const postingDateWord = text.match(/(?:Posting|Invoice)\s*Date[\s\S]{0,30}?(\d{1,2})[.\s]+([A-Za-z]+)\s+(\d{4})/i);
  const simpleDateField = text.match(/^Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/im);

  const parseSlashDDMMYYYY = (str) => {
    const parts = str.split("/");
    let year = parseInt(parts[2]);
    if (year < 2020) year = year + 20;
    if (year < 2020) year = 2026;
    return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  };

  if (invoiceDateSlash) result.invoiceDate = parseSlashDDMMYYYY(invoiceDateSlash[1]);
  else if (deliveryDateSlash) result.invoiceDate = parseSlashDDMMYYYY(deliveryDateSlash[1]);
  else if (simpleDateField) result.invoiceDate = parseSlashDDMMYYYY(simpleDateField[1]);
  else {
    const anyDate = text.match(/(\d{2}\/\d{2}\/20\d{2})/);
    if (anyDate) result.invoiceDate = parseSlashDDMMYYYY(anyDate[1]);
  }

  const lines = text.split("\n");
  const totalInclVat = text.match(/Total\s+GBP\s+Incl\.?\s*VAT\s*[£$]?\s*([\d,]+\.\d{2})/i);
  const totalSameLine = text.match(/\bTOTAL\b\s*[£$]?\s*([\d,]+\.\d{2})/i);

  if (totalInclVat) result.totalAmount = parseFloat(totalInclVat[1].replace(/[£$,]/g, ""));
  else if (totalSameLine) result.totalAmount = parseFloat(totalSameLine[1].replace(/,/g, ""));
  else {
    const totalGbp = text.match(/Total\s+GBP\s*[£$]?\s*([\d,]+\.\d{2})/i);
    if (totalGbp) result.totalAmount = parseFloat(totalGbp[1].replace(/,/g, ""));
  }

  return result;
}

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { fileName: 'Supplier JJ Foods June 29.pdf' }
  });

  if (!inv) return console.log("Not found");
  
  const ocrData = JSON.parse(inv.ocrData || '{}');
  const rawText = ocrData.rawText || '';
  
  console.log("=== PARSING RAW TEXT ===");
  const res = parseSupplierInvoice(rawText);
  console.log(res);
  
  console.log("\nLast 300 chars of raw text:");
  console.log(rawText.substring(rawText.length - 300));
}

main().catch(console.error).finally(() => prisma.$disconnect());
