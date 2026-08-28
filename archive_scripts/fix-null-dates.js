const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nullInvoices = await prisma.invoice.findMany({
    where: { invoiceDate: null }
  });

  console.log(`Found ${nullInvoices.length} invoices with no date.`);

  for (const inv of nullInvoices) {
    let newDate = new Date(); // Default to today if we can't guess

    // Try to guess from filename
    if (inv.fileName.toLowerCase().includes('july 10')) {
      newDate = new Date('2026-07-10T12:00:00Z');
    } else if (inv.fileName.toLowerCase().includes('july 03') || inv.fileName.toLowerCase().includes('july 3')) {
      newDate = new Date('2026-07-03T12:00:00Z');
    } else {
      // Fallback to createdAt
      newDate = inv.createdAt;
    }

    console.log(`Fixing invoice ${inv.id} (${inv.fileName}) -> ${newDate.toISOString().split('T')[0]}`);
    
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { invoiceDate: newDate }
    });
  }
  
  console.log("All null invoice dates have been fixed!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
