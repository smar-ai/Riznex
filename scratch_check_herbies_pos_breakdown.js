const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';

  const herbiesSales = await prisma.sale.findMany({
    where: {
      clientId: henleyClientId,
      store: 'Herbies Pizza',
      weekEnd: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z')
      }
    },
    include: { invoice: true },
    orderBy: { weekEnd: 'asc' }
  });

  console.log(`\n=== HERBIES PIZZA AUGUST 2026 SALES (${herbiesSales.length} RECORDS) ===\n`);
  herbiesSales.forEach(s => {
    console.log(`- ID: ${s.id} | Platform: ${s.platform.padEnd(10)} | Gross: £${s.grossSales.toFixed(2).padStart(8)} | Net: £${s.netPaid.toFixed(2).padStart(8)} | Date: ${s.weekEnd.toISOString().split('T')[0]}`);
    if (s.invoice?.ocrData) {
      try {
        const ocr = JSON.parse(s.invoice.ocrData);
        console.log(`  > OCR Channels: Website=${JSON.stringify(ocr.website)}, ConsumerApp=${JSON.stringify(ocr.consumerApp)}, S4DRegister=${JSON.stringify(ocr.s4dRegister)}`);
      } catch (e) {}
    }
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
