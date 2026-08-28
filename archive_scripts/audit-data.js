const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const start = new Date('2026-03-30T00:00:00.000Z');
  const end = new Date('2026-06-01T00:00:00.000Z');

  const weeks = [
    { name: 'April 05', end: new Date('2026-04-05T23:59:59.000Z') },
    { name: 'April 12', end: new Date('2026-04-12T23:59:59.000Z') },
    { name: 'April 19', end: new Date('2026-04-19T23:59:59.000Z') },
    { name: 'April 26', end: new Date('2026-04-26T23:59:59.000Z') },
    { name: 'May 03', end: new Date('2026-05-03T23:59:59.000Z') },
    { name: 'May 10', end: new Date('2026-05-10T23:59:59.000Z') },
    { name: 'May 17', end: new Date('2026-05-17T23:59:59.000Z') },
    { name: 'May 24', end: new Date('2026-05-24T23:59:59.000Z') },
    { name: 'May 31', end: new Date('2026-05-31T23:59:59.000Z') },
  ];

  const sales = await prisma.sale.findMany({ where: { clientId, weekEnd: { gte: start, lte: end } } });
  const wages = await prisma.staffWage.findMany({ where: { clientId, weekEnd: { gte: start, lte: end } } });
  const fixedExpenses = await prisma.expense.findMany({ where: { clientId, period: 'weekly', category: { not: 'wages' }, date: { gte: start, lte: end } } });
  const suppliers = await prisma.invoice.findMany({ where: { clientId, type: 'supplier', invoiceDate: { gte: start, lte: end } } });

  console.log("=== DATA AUDIT: APRIL & MAY 2026 ===\n");

  for (const week of weeks) {
    const isThisWeek = (date) => {
      if (!date) return false;
      const diff = Math.abs(date.getTime() - week.end.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 3; // within 3 days
    };

    const wSales = sales.filter(s => isThisWeek(s.weekEnd));
    const wWages = wages.filter(w => isThisWeek(w.weekEnd));
    const wExpenses = fixedExpenses.filter(e => isThisWeek(e.date));
    const wSuppliers = suppliers.filter(s => isThisWeek(s.invoiceDate));

    console.log(`[Week Ending ${week.name}]`);
    console.log(`  Sales Records:     ${wSales.length > 0 ? `OK (${wSales.length})` : 'MISSING'}`);
    console.log(`  Staff Wages:       ${wWages.length > 0 ? `OK (${wWages.length})` : 'MISSING'}`);
    console.log(`  Fixed Expenses:    ${wExpenses.length > 0 ? `OK (${wExpenses.length})` : 'MISSING'}`);
    console.log(`  Supplier Invoices: ${wSuppliers.length > 0 ? `OK (${wSuppliers.length})` : 'MISSING'}`);
    console.log("");
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
