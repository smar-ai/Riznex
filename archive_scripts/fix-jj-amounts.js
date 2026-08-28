const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

function extractJJTotal(text) {
  // JJ format: "298.83TOTAL0.00£ 298.83"
  // Match: digits, then TOTAL, then digits.digits, then £ space digits
  const m = text.match(/[\d.]+TOTAL[\d.]+£\s*([\d,]+\.\d{2})/);
  if (m) return parseFloat(m[1].replace(/,/g, ''));

  // Fallback: last occurrence of £ followed by a number in the doc
  const allPounds = [...text.matchAll(/£\s*([\d,]+\.\d{2})/g)];
  if (allPounds.length > 0) {
    return parseFloat(allPounds[allPounds.length - 1][1].replace(/,/g, ''));
  }
  return null;
}

async function main() {
  const jj = await prisma.invoice.findMany({
    where: { supplier: { name: 'JJ Food Service' }, amount: null }
  });

  console.log(`Found ${jj.length} JJ invoices with missing amounts.`);
  const pdfParse = (await import('pdf-parse')).default;

  for (const inv of jj) {
    const actualPath = path.join('E:\\restaurant-dashboard\\public', inv.filePath.replace(/\//g, '\\'));
    if (!fs.existsSync(actualPath)) { console.log(`❌ File missing: ${inv.fileName}`); continue; }

    const buffer = fs.readFileSync(actualPath);
    const pdfData = await pdfParse(buffer);
    const total = extractJJTotal(pdfData.text);

    if (total) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { amount: total, notes: 'Fixed by JJ regex parser' }
      });
      console.log(`✅ ${inv.fileName} => £${total}`);
    } else {
      console.log(`❌ ${inv.fileName} => still could not extract total`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
