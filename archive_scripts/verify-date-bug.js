const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const from = new Date('2026-05-01');
  const to = new Date('2026-05-31');

  // Find all auto-filled expenses in May
  const allMayExpenses = await prisma.expense.findMany({
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', date: { gte: from, lte: new Date('2026-05-31T23:59:59.999Z') }, period: { not: 'template' } }
  });
  console.log(`Total Expenses in May (full day May 31 included): ${allMayExpenses.length}`);
  
  const justMay31 = allMayExpenses.filter(e => e.date > to);
  console.log(`Expenses exactly ON May 31st after 00:00:00: ${justMay31.length}`);

  // Simulate /api/reports route logic:
  const reportsExpenses = await prisma.expense.findMany({
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', date: { gte: from, lte: to }, period: { not: 'template' } }
  });
  console.log(`Total Expenses in May (using API strict 'lte: to'): ${reportsExpenses.length}`);
}
main().finally(()=>prisma.$disconnect())
