const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const expenses = await prisma.expense.findMany({ 
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', is2025: false } 
  });
  console.log('False expenses:', expenses.filter(e => e.subcategory === 'Oxford Store').length);
  
  const trueExp = await prisma.expense.findMany({ 
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', is2025: true } 
  });
  console.log('True expenses:', trueExp.filter(e => e.subcategory === 'Oxford Store').length);
}
main().catch(console.error).finally(() => prisma.$disconnect())
