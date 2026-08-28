const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wages = await prisma.staffWage.findMany({ where: { clientId: 'client-1' } });
  console.log('--- SAMPLE WAGES IN DB ---');
  wages.slice(0, 10).forEach(w => console.log(`ID: ${w.id} | WeekEnd: ${w.weekEnd.toISOString()} | Amount: £${w.amount}`));

  const expenses = await prisma.expense.findMany({ where: { clientId: 'client-1' } });
  console.log('\n--- SAMPLE EXPENSES IN DB ---');
  expenses.slice(0, 10).forEach(e => console.log(`ID: ${e.id} | Date: ${e.date.toISOString()} | Category: ${e.category} | Amount: £${e.amount}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
