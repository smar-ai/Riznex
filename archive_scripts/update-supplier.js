const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const result = await prisma.supplier.updateMany({
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', name: 'One Stop' },
    data: { franchise: 'Herbies Pizza' }
  });
  console.log(`Updated ${result.count} supplier(s) to Herbies Pizza.`);
}
main().finally(()=>prisma.$disconnect())
