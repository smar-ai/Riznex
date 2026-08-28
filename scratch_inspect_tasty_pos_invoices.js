const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const tastyInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'pos', fileName: { contains: 'Tasty' } },
    select: { id: true, fileName: true, amount: true, ocrData: true }
  });

  console.log(`\n=== TASTY BUN POS INVOICES OCR DATA (${tastyInvoices.length} Invoices) ===\n`);

  tastyInvoices.slice(0, 5).forEach((inv, idx) => {
    console.log(`Invoice #${idx + 1}: ${inv.fileName} | Amount: £${inv.amount}`);
    console.log(`ocrData:`, inv.ocrData ? inv.ocrData.substring(0, 300) : 'NULL');
    console.log('---');
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
