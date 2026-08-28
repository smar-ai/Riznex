import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const inv = await p.invoice.findFirst({
  where: { 
    clientId: 'cmpv4dvik0000vdj089wl6zmf',
    ocrStatus: 'done',
    platform: { contains: 'Uber Eats' }
  },
  select: { id: true, fileName: true, ocrData: true, ocrStatus: true, notes: true }
})
console.log('fileName:', inv?.fileName)
console.log('ocrStatus:', inv?.ocrStatus)
console.log('notes:', inv?.notes)
if (inv?.ocrData) {
  const d = JSON.parse(inv.ocrData)
  console.log('ocrData keys:', Object.keys(d))
  console.log('adSpends:', d.adSpends)
  console.log('marketing:', d.marketing)
  console.log('grossSales:', d.grossSales)
  console.log('netPaid:', d.netPaid)
}

const sale = await p.sale.findFirst({
  where: { clientId: 'cmpv4dvik0000vdj089wl6zmf', invoiceId: inv?.id }
})
console.log('\nLinked sale adSpends:', sale?.adSpends)
await p.$disconnect()
