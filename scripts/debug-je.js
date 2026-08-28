const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const s = await prisma.sale.findUnique({
    where: { id: 'cms4zdywd000nvdx0ffz05hn0' }
  });
  console.log(s);
}
run().catch(console.error).finally(() => prisma.$disconnect());
