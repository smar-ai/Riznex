const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allSuppliers = await prisma.supplier.findMany({
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  const suppliers = allSuppliers.filter(s => s.name.toLowerCase().includes('bid'));

  console.log("=== MATCHING SUPPLIERS ===");
  if (suppliers.length === 0) {
    console.log("No suppliers found matching 'bid'.");
  } else {
    suppliers.forEach(s => {
      if (s.invoices.length > 0) {
        console.log(`\nSupplier: ${s.name} (${s.franchise})`);
        console.log("  Recent Invoices:");
        s.invoices.forEach(inv => {
          const dateStr = inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : 'No Date Assigned';
          console.log(`  - ${dateStr}: £${inv.amount} (File: ${inv.fileName})`);
        });
      }
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
