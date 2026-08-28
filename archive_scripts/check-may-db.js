const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const s = await prisma.sale.findMany({ 
    where: { 
      clientId: 'cmpv4dvik0000vdj089wl6zmf', 
      notes: { contains: 'May' } 
    } 
  });
  console.log(s.map(x=>x.notes));
}
main().finally(()=>prisma.$disconnect())
