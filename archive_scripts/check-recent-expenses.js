const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(expenses);
}
main().catch(console.error);
