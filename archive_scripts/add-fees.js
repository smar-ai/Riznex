const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  let supplier = await prisma.supplier.findFirst({
    where: { name: 'Herbies Head office', clientId }
  })
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { name: 'Herbies Head office', clientId }
    })
  }
  const supplierId = supplier.id

  // 1. Monthly POS fee: 150 GBP (July 2025 - March 2026)
  const months = [
    '2025-07-01', '2025-08-01', '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01',
    '2026-01-01', '2026-02-01', '2026-03-01'
  ]

  console.log("Adding Monthly POS Fees...")
  for (const dateStr of months) {
    const invoiceDate = new Date(dateStr)
    // Check for duplicates
    const existing = await prisma.invoice.findFirst({
      where: {
        clientId, supplierId, is2025: true, amount: 150,
        fileName: { contains: 'POS fee' },
        invoiceDate
      }
    })
    if (!existing) {
      await prisma.invoice.create({
        data: {
          clientId,
          supplierId,
          type: 'supplier',
          platform: null,
          fileName: `Manual Entry Herbies Pizza POS fee ${dateStr.substring(0,7)}`,
          fileType: 'manual',
          filePath: 'manual',
          amount: 150,
          invoiceDate,
          ocrStatus: 'done',
          is2025: true,
          notes: 'UNKNOWN'
        }
      })
      console.log(`Created Monthly POS fee for ${dateStr}`)
    } else {
      console.log(`Skipped duplicate POS fee for ${dateStr}`)
    }
  }

  // 2. Weekly Franchise fee: 250 GBP (July 2025 - March 2026)
  console.log("\nAdding Weekly Franchise Fees...")
  let currentDate = new Date('2025-07-07T00:00:00.000Z') // First Monday of July
  const endDate = new Date('2026-03-31T23:59:59.000Z')

  while (currentDate <= endDate) {
    const invoiceDate = new Date(currentDate)
    const dateStr = invoiceDate.toISOString().substring(0,10)
    
    const existing = await prisma.invoice.findFirst({
      where: {
        clientId, supplierId, is2025: true, amount: 250,
        fileName: { contains: 'Franchise fee' },
        invoiceDate
      }
    })
    if (!existing) {
      await prisma.invoice.create({
        data: {
          clientId,
          supplierId,
          type: 'supplier',
          platform: null,
          fileName: `Manual Entry Herbies Pizza Franchise fee ${dateStr}`,
          fileType: 'manual',
          filePath: 'manual',
          amount: 250,
          invoiceDate,
          ocrStatus: 'done',
          is2025: true,
          notes: 'UNKNOWN'
        }
      })
      console.log(`Created Weekly Franchise fee for ${dateStr}`)
    } else {
      console.log(`Skipped duplicate Franchise fee for ${dateStr}`)
    }

    // Add 7 days
    currentDate.setDate(currentDate.getDate() + 7)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
