const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inv = await prisma.invoice.findFirst({
    where: { fileName: 'Herbies Pizza Just Eat July 12.pdf' }
  });
  console.log('ocrData:', inv.ocrData);
  console.log('notes:', inv.notes);
}

run().finally(() => prisma.$disconnect());
