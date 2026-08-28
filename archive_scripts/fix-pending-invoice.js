const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const invoiceId = 'cmre3ttw40001vd40q65jatsf';
  
  console.log("=== FIXING PENDING INVOICE ===");
  
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ocrStatus: 'done',
      notes: 'Manually marked as done to clear processing status'
    }
  });

  console.log("Invoice marked as done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
