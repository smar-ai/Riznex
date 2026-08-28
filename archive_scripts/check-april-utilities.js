const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({
    where: {
      category: { in: ['electricity', 'gas', 'water'] },
      date: {
        gte: new Date('2026-04-01T00:00:00Z'),
        lte: new Date('2026-04-30T23:59:59Z')
      }
    }
  });
  console.log(expenses);
}
main().catch(console.error);
