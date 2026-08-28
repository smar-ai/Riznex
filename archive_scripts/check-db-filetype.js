const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { fileName: 'Supplier JJ Foods June 29.pdf' }
  });

  console.log("JJ Foods PDF fileType in DB:", inv.fileType);
  console.log("JJ Foods PDF ext in DB:", inv.fileName);
}

main().catch(console.error).finally(() => prisma.$disconnect());
