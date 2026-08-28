const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const henley = await prisma.client.findFirst({ where: { name: { contains: 'Henley' } } });
  if (!henley) return console.log("Henley client not found");

  const id = henley.id;

  // 2025 Sandbox Data Date Range
  const firstSale2025 = await prisma.sale.findFirst({ where: { clientId: id, is2025: true }, orderBy: { weekStart: 'asc' } });
  const lastSale2025 = await prisma.sale.findFirst({ where: { clientId: id, is2025: true }, orderBy: { weekStart: 'desc' } });

  console.log(`\n--- 2025 Sandbox Sales Date Range ---`);
  if (firstSale2025 && lastSale2025) {
    console.log(`${firstSale2025.weekStart.toISOString().split('T')[0]} to ${lastSale2025.weekEnd.toISOString().split('T')[0]}`);
  } else {
    console.log("No 2025 Sandbox Sales found.");
  }

  // All sales sorted by date
  const allSales = await prisma.sale.findMany({ where: { clientId: id }, orderBy: { weekStart: 'asc' } });
  console.log(`\n--- Total Sales Records: ${allSales.length} ---`);
  console.log(`Earliest Sale: ${allSales[0]?.weekStart.toISOString().split('T')[0]} (is2025: ${allSales[0]?.is2025})`);
  console.log(`Latest Sale: ${allSales[allSales.length - 1]?.weekStart.toISOString().split('T')[0]} (is2025: ${allSales[allSales.length - 1]?.is2025})`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
