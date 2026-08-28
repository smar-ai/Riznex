const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: { is2025: true, type: 'supplier' },
    include: { supplier: true }
  })
  const uniqueSuppliers = new Set(invoices.map(i => i.supplier?.name).filter(Boolean))
  console.log('Unique suppliers with invoices in 2025:', Array.from(uniqueSuppliers))
  
  const allSuppliers = await prisma.supplier.findMany()
  console.log('Total suppliers in DB:', allSuppliers.length, allSuppliers.map(s => s.name))
}

main().catch(console.error).finally(() => prisma.$disconnect())
