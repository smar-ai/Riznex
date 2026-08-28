const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const e = await prisma.expense.findMany({ 
    where: { 
      clientId: 'cmpv4dvik0000vdj089wl6zmf', 
      date: { gte: new Date('2026-05-01') } 
    } 
  });
  console.log(e.filter(x => x.description && x.description.includes('POS')));
}
main().finally(()=>prisma.$disconnect())
