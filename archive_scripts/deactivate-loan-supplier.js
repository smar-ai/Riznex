const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  const result = await prisma.supplier.updateMany({
    where: {
      clientId,
      name: 'Shahzad Loan'
    },
    data: {
      active: false
    }
  });

  console.log(`Updated ${result.count} supplier(s) named 'Shahzad Loan' to inactive.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
