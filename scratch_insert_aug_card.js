const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'client-1';

  // 1. Week 3 Aug 2026 - 9 Aug 2026
  const week1Start = new Date('2026-08-03T00:00:00.000Z');
  const week1End   = new Date('2026-08-09T00:00:00.000Z');
  const week1Amount = 1389.72; // 216.02 + 117.85 + 125.08 + 164.14 + 211.47 + 296.06 + 259.10

  // 2. Week 10 Aug 2026 - 16 Aug 2026
  const week2Start = new Date('2026-08-10T00:00:00.000Z');
  const week2End   = new Date('2026-08-16T00:00:00.000Z');
  const week2Amount = 1480.69; // 326.27 + 23.98 + 71.94 + 287.20 + 263.67 + 158.34 + 349.29

  // Create Invoice 1 (3-9 Aug)
  await prisma.invoice.create({
    data: {
      clientId,
      type: 'pos',
      platform: 'Walk-in Card',
      fileName: 'Walk-in_Card_03Aug-09Aug_2026.pdf',
      filePath: '/uploads/manual_entry.pdf',
      fileType: 'application/pdf',
      amount: week1Amount,
      invoiceDate: week1End,
      ocrStatus: 'done',
      notes: 'Manual entry for Walk-in Card 3-9 Aug 2026'
    }
  });

  // Create Sale 1 (3-9 Aug)
  await prisma.sale.create({
    data: {
      clientId,
      store: 'Combined',
      platform: 'Walk In Card',
      weekStart: week1Start,
      weekEnd: week1End,
      totalOrders: 65,
      grossSales: week1Amount,
      netPaid: week1Amount,
      commission: 0,
      vat: 0,
      adSpends: 0,
      topRankFee: 0
    }
  });

  // Create Invoice 2 (10-16 Aug)
  await prisma.invoice.create({
    data: {
      clientId,
      type: 'pos',
      platform: 'Walk-in Card',
      fileName: 'Walk-in_Card_10Aug-16Aug_2026.pdf',
      filePath: '/uploads/manual_entry.pdf',
      fileType: 'application/pdf',
      amount: week2Amount,
      invoiceDate: week2End,
      ocrStatus: 'done',
      notes: 'Manual entry for Walk-in Card 10-16 Aug 2026'
    }
  });

  // Create Sale 2 (10-16 Aug)
  await prisma.sale.create({
    data: {
      clientId,
      store: 'Combined',
      platform: 'Walk In Card',
      weekStart: week2Start,
      weekEnd: week2End,
      totalOrders: 70,
      grossSales: week2Amount,
      netPaid: week2Amount,
      commission: 0,
      vat: 0,
      adSpends: 0,
      topRankFee: 0
    }
  });

  console.log('SUCCESS: Inserted Walk-in Card records for August 2026:');
  console.log(`- 03 Aug - 09 Aug 2026: £${week1Amount}`);
  console.log(`- 10 Aug - 16 Aug 2026: £${week2Amount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
