const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.invoice.update({
    where: { id: 'cms53pgnh002rvdx0oszcksgu' },
    data: {
      invoiceDate: new Date('2026-07-15T00:00:00Z')
    }
  });
  console.log("Updated invoice date to July 15, 2026");
}
run().catch(console.error).finally(() => prisma.$disconnect());
