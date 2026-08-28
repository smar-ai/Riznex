const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  // Find all suppliers for this client
  const suppliers = await prisma.supplier.findMany({
    where: { clientId },
    include: {
      invoices: {
        where: { is2025: false } // only real / active invoices
      }
    }
  });

  console.log("=== ACTIVE SUPPLIERS AUDIT ===");
  console.log(`Total Suppliers in Database: ${suppliers.length}\n`);

  suppliers.forEach(s => {
    console.log(`- Supplier Name: ${s.name}`);
    console.log(`  Franchise/Store: ${s.franchise}`);
    console.log(`  Invoices Count (Real): ${s.invoices.length}`);
    if (s.invoices.length > 0) {
      const totalAmount = s.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      console.log(`  Total Invoiced Amount (Real): £${totalAmount.toFixed(2)}`);
    }
    console.log("");
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
