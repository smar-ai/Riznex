const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const s = await prisma.sale.findMany({ 
    where: { 
      clientId: 'cmpv4dvik0000vdj089wl6zmf', 
      weekEnd: new Date('2026-05-10T23:59:59.000Z') 
    } 
  });
  console.log(s.filter(x=>x.platform.includes('Website')));
}
main().finally(()=>prisma.$disconnect())
