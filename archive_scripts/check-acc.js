const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const exps = await prisma.expense.findMany({ where: { is2025: true } });
  const acc = exps.filter(e => e.subcategory && e.subcategory.toLowerCase().includes('accountant'));
  console.log('Accountant records found:', acc.length);
}

main().finally(() => prisma.$disconnect())
