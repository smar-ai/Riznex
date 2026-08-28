const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const suppliers = await prisma.supplier.findMany({
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf' }
  });
  console.log(suppliers.map(s => `${s.name} - ${s.franchise}`));
}
main().finally(()=>prisma.$disconnect())
