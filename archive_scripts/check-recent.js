const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recent = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { supplier: true }
  });

  console.log("=== LAST 15 UPLOADS ===");
  recent.forEach(inv => {
    console.log(`[${inv.createdAt.toISOString()}] ${inv.fileName}`);
    console.log(`  Supplier: ${inv.supplier?.name || 'None'} | Amount: £${inv.amount} | OCR: ${inv.ocrStatus}`);
    console.log(`  Notes: ${inv.notes?.substring(0, 80) || 'none'}`);
    console.log('---');
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
