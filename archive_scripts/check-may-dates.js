const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const from = new Date('2026-05-01');
  const to = new Date('2026-05-31T23:59:59.999Z');

  const allMayExpenses = await prisma.expense.findMany({
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', date: { gte: from, lte: to }, period: { not: 'template' } }
  });
  
  // Group by date to see which weeks they auto-filled
  const dates = [...new Set(allMayExpenses.map(e => e.date.toISOString()))].sort();
  console.log("Expense Dates found in May:");
  console.log(dates);
}
main().finally(()=>prisma.$disconnect())
