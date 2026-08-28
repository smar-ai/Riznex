const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const inv = await prisma.invoice.findUnique({
    where: { id: 'cmq8ncw8r004gvdok1sogqsec' }
  });
  console.log(`Invoice Date: ${inv.invoiceDate.toISOString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
