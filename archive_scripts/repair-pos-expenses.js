const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getWeekStartUTC(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getWeekEndUTC(weekStart) {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

async function main() {
  console.log("Starting POS expenses repair...");
  
  const invoices = await prisma.invoice.findMany({
    where: { type: 'pos', ocrStatus: 'done' }
  });

  console.log(`Found ${invoices.length} POS invoices to check.`);

  for (const inv of invoices) {
    if (!inv.ocrData) continue;
    
    let ocrData;
    try {
      ocrData = JSON.parse(inv.ocrData);
    } catch (e) {
      console.error(`Error parsing OCR data for invoice ${inv.id}:`, e.message);
      continue;
    }

    const pExp = ocrData.posExpenses;
    if (!pExp) {
      console.log(`No posExpenses found in OCR data for invoice ${inv.fileName}`);
      continue;
    }

    const expenseDate = inv.invoiceDate ? new Date(inv.invoiceDate) : new Date(inv.createdAt);
    const storeName = inv.platform ? inv.platform.replace(" POS", "") : "Combined";

    console.log(`\nProcessing POS report: ${inv.fileName} (${expenseDate.toISOString().split('T')[0]}) for store: ${storeName}`);
    console.log(`OCR Expenses found: One Stop: ${pExp.oneStop || 0}, Petrol: ${pExp.petrol || 0}, Wages/Other: Wages: ${pExp.wages || 0}, Other: ${pExp.other || 0}`);

    // 1. One Stop (Supplier Invoice)
    if (pExp.oneStop && pExp.oneStop > 0) {
      // Find or create 'One Stop' supplier for this client
      let oneStopSup = await prisma.supplier.findFirst({
        where: { name: "One Stop", clientId: inv.clientId }
      });
      if (!oneStopSup) {
        console.log(`Creating 'One Stop' supplier for client ${inv.clientId}...`);
        oneStopSup = await prisma.supplier.create({
          data: {
            clientId: inv.clientId,
            name: "One Stop",
            category: "food",
            franchise: "Combined"
          }
        });
      }

      // Check if a supplier invoice for One Stop linked to this POS invoice already exists
      const existingOneStopInvoice = await prisma.invoice.findFirst({
        where: {
          type: "supplier",
          supplierId: oneStopSup.id,
          sourceInvoiceId: inv.id
        }
      });

      if (!existingOneStopInvoice) {
        console.log(`  --> Creating missing One Stop invoice of £${pExp.oneStop}...`);
        await prisma.invoice.create({
          data: {
            clientId: inv.clientId,
            is2025: inv.is2025,
            type: "supplier",
            supplierId: oneStopSup.id,
            platform: storeName,
            amount: pExp.oneStop,
            invoiceDate: expenseDate,
            fileName: `Extracted from POS: ${inv.fileName}`,
            filePath: inv.filePath,
            fileType: inv.fileType,
            ocrStatus: "done",
            notes: "Auto-created from POS report during repair script run",
            sourceInvoiceId: inv.id
          }
        });
      } else {
        console.log(`  [OK] One Stop invoice of £${pExp.oneStop} already exists (linked to this POS invoice).`);
      }
    }

    // 2. Drivers Petrol (Expense -> 'fuel' category)
    if (pExp.petrol && pExp.petrol > 0) {
      const existingPetrol = await prisma.expense.findFirst({
        where: {
          category: "fuel",
          subcategory: "Drivers Petrol",
          invoiceId: inv.id
        }
      });

      if (!existingPetrol) {
        console.log(`  --> Creating missing Drivers Petrol expense of £${pExp.petrol}...`);
        await prisma.expense.create({
          data: {
            clientId: inv.clientId,
            is2025: inv.is2025,
            category: "fuel",
            subcategory: "Drivers Petrol",
            amount: pExp.petrol,
            period: "weekly",
            date: expenseDate,
            notes: `Auto-created from POS report: ${inv.fileName} during repair script run`,
            invoiceId: inv.id
          }
        });
      } else {
        console.log(`  [OK] Drivers Petrol expense of £${pExp.petrol} already exists.`);
      }
    }

    // 3. Other Expense
    if (pExp.other && pExp.other > 0) {
      const existingOther = await prisma.expense.findFirst({
        where: {
          category: "misc",
          subcategory: "Other POS Expense",
          invoiceId: inv.id
        }
      });

      if (!existingOther) {
        console.log(`  --> Creating missing Other POS expense of £${pExp.other}...`);
        await prisma.expense.create({
          data: {
            clientId: inv.clientId,
            is2025: inv.is2025,
            category: "misc",
            subcategory: "Other POS Expense",
            amount: pExp.other,
            period: "weekly",
            date: expenseDate,
            notes: `Auto-created from POS report: ${inv.fileName} during repair script run`,
            invoiceId: inv.id
          }
        });
      } else {
        console.log(`  [OK] Other POS expense of £${pExp.other} already exists.`);
      }
    }
  }

  console.log("\nPOS expenses repair completed successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
