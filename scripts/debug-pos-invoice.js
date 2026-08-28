const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inv = await prisma.invoice.findUnique({
    where: { id: 'cms52v86l001zvdx0zajmec6b' },
    include: { sales: true }
  });
  console.log(JSON.stringify(inv, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
