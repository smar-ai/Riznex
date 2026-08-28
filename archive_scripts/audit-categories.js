const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.expense.groupBy({
    by: ['category'],
    _count: { category: true }
  });
  console.log("Expense Categories:", categories);
}

main().catch(console.error).finally(() => prisma.$disconnect());
