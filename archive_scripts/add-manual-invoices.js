const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const dataText = `
JULY
HERBIES 5492.02 NOT PAID
N&B 2421.98 PAID
EXPRESS 188.91 PAID
KNIFE SERVIC 12.72
AUGUST
HERBIES 3983.20
N&b 70.01
KNIFE SERVICE 12.72 PAID
SEPTEMBER
HERBIES 4112.53 UNPAID
N&B 230.57
EXPRESS 387.95 PAID
KNIFE SERVICE 12.72 PAID
OCTOBER
HERBIES 2650.81
N&b 1216.59 PAID
KNIFE SERVICE 12.72
NOVEMBER
HERBIES 3016.45
N&b 921.51 PAID
KNIFE SERVICE 12.72 PAID
DECEMBER
HERBIES 4019.93 UNPAID
N&b 344.79
KNIFE SERVICE 12.72
`

const monthMap = {
  JULY: '2025-07-31T00:00:00.000Z',
  AUGUST: '2025-08-31T00:00:00.000Z',
  SEPTEMBER: '2025-09-30T00:00:00.000Z',
  OCTOBER: '2025-10-31T00:00:00.000Z',
  NOVEMBER: '2025-11-30T00:00:00.000Z',
  DECEMBER: '2025-12-31T00:00:00.000Z'
}

const supplierMap = {
  'HERBIES': 'Herbies Head office',
  'N&B': 'N&B food Service',
  'EXPRESS': 'Express food service',
  'KNIFE': 'Knife service'
}

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  const supplierCache = {}
  for (const suppName of Object.values(supplierMap)) {
    let supplier = await prisma.supplier.findFirst({
      where: { name: suppName, clientId }
    })
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: { name: suppName, clientId }
      })
    }
    supplierCache[suppName] = supplier.id
  }

  const lines = dataText.trim().split('\n')
  let currentMonth = ''

  for (const line of lines) {
    const l = line.trim()
    if (!l || l.includes('CASH EXPENSE')) continue

    if (monthMap[l]) {
      currentMonth = monthMap[l]
      continue
    }

    // Match supplier name and amount
    const match = l.match(/^([A-Za-z&\s]+)\s+([\d.]+)(?:\s+(PAID|NOT PAID|UNPAID))?/i)
    if (match) {
      let rawSupp = match[1].trim().toUpperCase()
      rawSupp = rawSupp.replace(' SERVICE', '').replace(' SERVIC', '')
      
      const amount = parseFloat(match[2])
      const statusStr = match[3] ? match[3].toUpperCase() : ''
      const isPaid = statusStr === 'PAID'
      const statusText = statusStr || 'UNSPECIFIED'
      
      let suppKey = null
      for (const k of Object.keys(supplierMap)) {
        if (rawSupp.includes(k) || k.includes(rawSupp)) {
          suppKey = k; break;
        }
      }
      
      if (!suppKey) {
        console.log('Could not match supplier:', rawSupp, 'Line:', l)
        continue
      }
      
      const supplierName = supplierMap[suppKey]
      const supplierId = supplierCache[supplierName]

      // Determine if there is already an invoice for this supplier, month, and amount
      const existing = await prisma.invoice.findFirst({
        where: {
          clientId,
          supplierId,
          is2025: true,
          amount,
          invoiceDate: new Date(currentMonth)
        }
      })
      if (existing) {
        console.log(`Skipping duplicate ${supplierName} for ${currentMonth}`)
        continue
      }

      await prisma.invoice.create({
        data: {
          clientId,
          supplierId,
          type: 'supplier',
          platform: null,
          fileName: `Manual Entry ${supplierName} ${currentMonth.substring(0,7)}`,
          fileType: 'manual',
          filePath: 'manual',
          amount,
          invoiceDate: new Date(currentMonth),
          ocrStatus: 'done',
          is2025: true,
          notes: statusText === 'PAID' ? 'PAID' : (statusText === 'UNSPECIFIED' ? 'UNKNOWN' : 'UNPAID')
        }
      })
      console.log(`Created invoice for ${supplierName}: £${amount} in ${currentMonth}`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
