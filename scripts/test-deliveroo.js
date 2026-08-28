const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.invoice.findFirst({
    where: { platform: 'Deliveroo' },
    orderBy: { createdAt: 'desc' }
  });
  if (invoice && invoice.ocrData) {
    const data = JSON.parse(invoice.ocrData);
    console.log("=== RAW TEXT ===");
    console.log(data.rawText);
  } else {
    console.log("No Deliveroo invoice found or no ocrData.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
