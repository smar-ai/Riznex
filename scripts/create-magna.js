const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const existing = await prisma.supplier.findFirst({
    where: { name: 'Magna Food Service' }
  });
  if (existing) {
    console.log('Already exists:', existing);
  } else {
    const defaultSupplier = await prisma.supplier.findFirst();
    const newSupplier = await prisma.supplier.create({
      data: {
        name: 'Magna Food Service',
        category: 'food',
        franchise: 'Tasty Bun',
        active: true,
        clientId: defaultSupplier.clientId
      }
    });
    console.log('Created supplier:', newSupplier);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
