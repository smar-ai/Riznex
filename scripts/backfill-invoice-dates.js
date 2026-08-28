const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: null,
      ocrStatus: 'done'
    }
  })

  for (const inv of invoices) {
    if (inv.ocrData) {
      try {
        const data = JSON.parse(inv.ocrData)
        const d = data.invoiceDate ? new Date(data.invoiceDate) : (data.weekStart ? new Date(data.weekStart) : null)
        if (d && !isNaN(d.getTime())) {
          console.log(`Updating invoice ${inv.id} with date ${d.toISOString()}`)
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { invoiceDate: d }
          })
        }
      } catch (e) {
        console.error("Failed to parse ocrData for", inv.id)
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
