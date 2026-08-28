// Backfill adSpends, marketing, customers, etc. from stored ocrData into Sale records
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const clientId = 'cmpv4dvik0000vdj089wl6zmf'

// Get all sales that have a linked invoice
const sales = await p.sale.findMany({
  where: { clientId, invoiceId: { not: null } },
  include: { invoice: { select: { id: true, ocrData: true, fileName: true } } }
})

console.log(`Found ${sales.length} sales with linked invoices`)
let updated = 0
let skipped = 0

for (const sale of sales) {
  if (!sale.invoice?.ocrData) { skipped++; continue }
  
  let ocrData
  try { ocrData = JSON.parse(sale.invoice.ocrData) } catch { skipped++; continue }
  
  // Only update if there's meaningful data to backfill
  const hasNewData = ocrData.adSpends || ocrData.marketing || ocrData.customers || 
                     ocrData.offersOnItems || ocrData.offerRedemptionFee
  if (!hasNewData) { skipped++; continue }
  
  await p.sale.update({
    where: { id: sale.id },
    data: {
      adSpends: ocrData.adSpends ?? sale.adSpends,
      marketing: ocrData.marketing ?? sale.marketing,
      customers: ocrData.customers ?? sale.customers,
      offersOnItems: ocrData.offersOnItems ?? sale.offersOnItems,
      offerRedemptionFee: ocrData.offerRedemptionFee ?? sale.offerRedemptionFee,
      vatRoundingAdj: ocrData.vatRoundingAdj ?? sale.vatRoundingAdj,
      otherPayments: ocrData.otherPayments ?? sale.otherPayments,
    }
  })
  console.log(`  ✓ Updated sale ${sale.id} (${sale.invoice.fileName}): adSpends=${ocrData.adSpends} marketing=${ocrData.marketing}`)
  updated++
}

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`)
await p.$disconnect()
