const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const herbiesInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'pos', fileName: { contains: 'Herbies' } },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n=== HERBIES POS INVOICES UPLOADED AUDIT (${herbiesInvoices.length} Invoices) ===\n`);

  herbiesInvoices.forEach((inv, idx) => {
    console.log(`#${idx + 1}: ${inv.fileName} | Amount: £${inv.amount} | Date: ${inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : 'N/A'}`);
    if (inv.ocrData) {
      try {
        const ocr = JSON.parse(inv.ocrData);
        console.log(`   - POS Till (s4dRegister): £${ocr.s4dRegister?.net || ocr.s4dRegister?.gross || 0}`);
        console.log(`   - Web & App (web+app):    £${(ocr.website?.net || ocr.website?.gross || 0) + (ocr.consumerApp?.net || ocr.consumerApp?.gross || 0)}`);
      } catch (e) {
        console.log(`   - ocrData parse error`);
      }
    } else {
      console.log(`   - Pending OCR parsing...`);
    }
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
