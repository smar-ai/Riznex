const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.expense.findMany({
    where: { period: 'template' }
  });

  console.log("\n=== WEEKLY FIXED EXPENSES (TEMPLATES) ===");
  if (templates.length === 0) {
    console.log("No templates found.");
  } else {
    templates.forEach(t => {
      console.log(`- ${t.category.toUpperCase()}${t.subcategory ? ' (' + t.subcategory + ')' : ''}: £${t.amount} ${t.notes ? '[' + t.notes + ']' : ''}`);
    });
  }

  const staff = await prisma.staff.findMany({
    where: { active: true }
  });

  console.log("\n=== ACTIVE STAFF SALARIES (WEEKLY WAGE) ===");
  if (staff.length === 0) {
    console.log("No active staff found.");
  } else {
    staff.forEach(s => {
      console.log(`- ${s.name} (${s.role || 'No Role'}): £${s.weeklyWage || 0}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
