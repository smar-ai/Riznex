const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestWage = await prisma.staffWage.findFirst({
    orderBy: { weekEnd: 'desc' },
    select: { weekEnd: true, amount: true, staff: { select: { name: true } } }
  });

  console.log("=== LATEST WAGE DATE ===");
  if (latestWage) {
    console.log(`Latest Salary Processed: ${latestWage.weekEnd.toISOString().split('T')[0]}`);
    console.log(`(e.g., £${latestWage.amount} for ${latestWage.staff.name})`);
  } else {
    console.log("No wages found in the database.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
