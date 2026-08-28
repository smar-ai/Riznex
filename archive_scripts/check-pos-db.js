const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const s = await prisma.sale.findMany({ 
    where: { 
      clientId: 'cmpv4dvik0000vdj089wl6zmf', 
      notes: { contains: 'POS 05 May' } 
    } 
  });
  console.log(s);
}
main().finally(()=>prisma.$disconnect())
