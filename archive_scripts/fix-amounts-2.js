const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.invoice.updateMany({
    where: { fileName: 'Supplier head Office June 19.jpeg' },
    data: { amount: 216.17 }
  });
  console.log("Updated June 19 to £216.17");

  await prisma.invoice.updateMany({
    where: { fileName: 'Supplier head Office June 15.jpeg' },
    data: { amount: 383.92 }
  });
  console.log("Updated June 15 to £383.92");
}

main().catch(console.error).finally(() => prisma.$disconnect());
