const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const supplier = await prisma.supplier.findFirst({
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', name: 'One Stop' }
  });
  console.log(supplier);
}
main().finally(()=>prisma.$disconnect())
