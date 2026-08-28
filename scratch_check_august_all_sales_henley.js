const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';

  const sales = await prisma.sale.findMany({
    where: {
      clientId: henleyClientId,
      weekEnd: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z')
      }
    },
    orderBy: { weekEnd: 'asc' }
  });

  console.log(`\n=== ALL AUGUST 2026 SALES FOR HENLEY (${sales.length} RECORDS) ===\n`);
  sales.forEach(s => {
    console.log(`[Store: ${s.store.padEnd(13)}] [Platform: ${s.platform.padEnd(12)}] [Gross: £${s.grossSales.toFixed(2).padStart(8)}] [NetPaid: £${s.netPaid.toFixed(2).padStart(8)}] [WeekEnd: ${s.weekEnd.toISOString().split('T')[0]}]`);
  });

  // Calculate totals per store
  const stores = ['Herbies Pizza', 'Tasty Bun', 'Combined'];
  stores.forEach(st => {
    let filtered = sales;
    if (st !== 'Combined') filtered = sales.filter(s => s.store === st);
    const gross = filtered.reduce((a, b) => a + b.grossSales, 0);
    const net = filtered.reduce((a, b) => a + b.netPaid, 0);
    const orders = filtered.reduce((a, b) => a + b.totalOrders, 0);
    console.log(`\nTOTALS FOR ${st.toUpperCase()}: Gross = £${gross.toFixed(2)}, Net = £${net.toFixed(2)}, Orders = ${orders}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
