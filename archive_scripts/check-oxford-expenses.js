const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const exps = await prisma.expense.findMany({ 
    where: { 
      clientId: 'cmpv4dvik0000vdj089wl6zmf', 
      subcategory: { in: ['Oxford Store', 'Building Insurance', 'Store Reparation Fee'] } 
    } 
  });
  console.log(exps.map(e => ({ sub: e.subcategory, amt: e.amount, is25: e.is2025 })));
}
main().catch(console.error).finally(() => prisma.$disconnect())
