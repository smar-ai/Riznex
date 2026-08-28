const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const henley = await prisma.client.findFirst({ where: { name: { contains: 'Henley' } } });
  if (!henley) return console.log("Henley client not found");

  const id = henley.id;
  
  // Counts
  const sales = await prisma.sale.count({ where: { clientId: id } });
  const sales2025 = await prisma.sale.count({ where: { clientId: id, is2025: true } });
  
  const expenses = await prisma.expense.count({ where: { clientId: id } });
  const expenses2025 = await prisma.expense.count({ where: { clientId: id, is2025: true } });
  
  const invoices = await prisma.invoice.count({ where: { clientId: id } });
  const invoices2025 = await prisma.invoice.count({ where: { clientId: id, is2025: true } });
  
  const suppliers = await prisma.supplier.count({ where: { clientId: id } });
  
  const staff = await prisma.staff.count({ where: { clientId: id } });
  
  const wages = await prisma.staffWage.count({ where: { clientId: id } });
  const wages2025 = await prisma.staffWage.count({ where: { clientId: id, is2025: true } });
  
  const stocks = await prisma.stock.count({ where: { clientId: id } });
  const stocks2025 = await prisma.stock.count({ where: { clientId: id, is2025: true } });

  // Range of sales dates
  const firstSale = await prisma.sale.findFirst({ where: { clientId: id, is2025: false }, orderBy: { weekStart: 'asc' } });
  const lastSale = await prisma.sale.findFirst({ where: { clientId: id, is2025: false }, orderBy: { weekStart: 'desc' } });

  console.log(`--- Live 2024 Data ---`);
  console.log(`Sales Records: ${sales - sales2025}`);
  console.log(`Expenses Records: ${expenses - expenses2025}`);
  console.log(`Invoices: ${invoices - invoices2025}`);
  console.log(`Staff Wages: ${wages - wages2025}`);
  console.log(`Stocks: ${stocks - stocks2025}`);
  if (firstSale && lastSale) {
    console.log(`Sales Date Range: ${firstSale.weekStart.toISOString().split('T')[0]} to ${lastSale.weekEnd.toISOString().split('T')[0]}`);
  }

  console.log(`\n--- 2025 Sandbox Data ---`);
  console.log(`Sales Records: ${sales2025}`);
  console.log(`Expenses Records: ${expenses2025}`);
  console.log(`Invoices: ${invoices2025}`);
  console.log(`Staff Wages: ${wages2025}`);
  console.log(`Stocks: ${stocks2025}`);

  console.log(`\n--- General (Shared) ---`);
  console.log(`Suppliers Registered: ${suppliers}`);
  console.log(`Staff Members: ${staff}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
