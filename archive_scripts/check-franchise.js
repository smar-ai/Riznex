const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({
    where: {
      OR: [
        { subcategory: { contains: 'Franchise' } },
        { subcategory: { contains: 'POS' } },
        { subcategory: { contains: 'Handling Fee' } }
      ],
      period: 'weekly'
    },
    orderBy: { date: 'asc' }
  });

  console.log(`Found ${expenses.length} records. Here are the last 15:`);
  expenses.slice(-15).forEach(e => {
    console.log(`[${e.date.toISOString().split('T')[0]}] ${e.category} | ${e.subcategory} | £${e.amount} | Store: ${e.store}`);
  });
}

main().catch(console.error);
