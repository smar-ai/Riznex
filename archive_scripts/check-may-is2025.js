const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const s = await prisma.sale.findMany({ 
    where: { 
      clientId: 'cmpv4dvik0000vdj089wl6zmf', 
      notes: { contains: 'May' } 
    } 
  });
  s.forEach(x => {
    if (x.notes.includes('POS')) {
      console.log(`Notes: ${x.notes} | is2025: ${x.is2025}`);
    }
  });
}
main().finally(()=>prisma.$disconnect())
