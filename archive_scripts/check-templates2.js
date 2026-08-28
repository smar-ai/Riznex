const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const expenses = await prisma.expense.findMany({
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', period: 'template' }
  });
  console.log(expenses);
}
main().finally(()=>prisma.$disconnect())
