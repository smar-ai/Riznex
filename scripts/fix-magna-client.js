const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const updated = await prisma.supplier.updateMany({
    where: { name: 'Magna Food Service' },
    data: { clientId: 'cmpv4dvik0000vdj089wl6zmf' }
  });
  console.log(`Updated ${updated.count} suppliers to the correct clientId.`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
