const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function getWeekEnd(d) {
  const start = getWeekStart(d);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  end.setUTCHours(0, 0, 0, 0);
  return end;
}

async function main() {
  const clientId = 'client-1';

  // List of all week end dates from May 2026 to August 16, 2026
  const weekEnds = [
    '2026-05-03', '2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31',
    '2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28',
    '2026-07-05', '2026-07-12', '2026-07-19', '2026-07-26', '2026-08-02',
    '2026-08-09', '2026-08-16'
  ];

  console.log('--- AUDITING AUTO-FILL EXPENSES FROM MAY TO 16 AUG 2026 ---');

  for (const wStr of weekEnds) {
    const targetDate = new Date(wStr + 'T00:00:00.000Z');
    const weekStart = getWeekStart(targetDate);
    const weekEnd = getWeekEnd(targetDate);

    const wagesCount = await prisma.staffWage.count({ where: { clientId, weekEnd } });
    const supplierCount = await prisma.invoice.count({ where: { clientId, type: 'supplier', invoiceDate: weekEnd } });
    const expenseCount = await prisma.expense.count({ where: { clientId, date: weekEnd } });
    const cashCount = await prisma.sale.count({ where: { clientId, platform: 'Walk In Cash', weekEnd } });

    console.log(`Week Ending ${weekEnd.toISOString().split('T')[0]}: Wages=${wagesCount}, Suppliers=${supplierCount}, Utilities/Expenses=${expenseCount}, CashSales=${cashCount}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
