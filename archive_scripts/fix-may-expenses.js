const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pdfParse = require('pdf-parse');

const POS_DIR = "E:\\All Projects\\Herbies & Tasty Bun\\Invoices\\May";

async function parsePOSFile(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  const text = data.text;

  const getAmountReverse = (regex) => {
    const match = [...text.matchAll(regex)];
    if (match.length > 0) {
      const lastMatch = match[match.length - 1];
      return parseFloat(lastMatch[1].replace(/,/g, ''));
    }
    return 0;
  };

  const expenses = {
    oneStop: getAmountReverse(/One stop[\s\S]*?([\d,]+\.\d{2})/gi),
    petrol: getAmountReverse(/Petrol Money[\s\S]*?([\d,]+\.\d{2})/gi),
    wages: getAmountReverse(/Wages[\s\S]*?([\d,]+\.\d{2})/gi),
    other: getAmountReverse(/Expense[\s\S]*?([\d,]+\.\d{2})/gi)
  };
  
  // Extract date to find the weekStart
  const dateMatch = text.match(/Date till:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  let weekStart = null;
  if (dateMatch) {
    const d = parseInt(dateMatch[1]);
    const m = parseInt(dateMatch[2]) - 1;
    const y = parseInt(dateMatch[3]);
    const dateTill = new Date(y, m, d);
    dateTill.setDate(dateTill.getDate() - 7);
    weekStart = dateTill;
  }

  return { expenses, weekStart };
}

async function main() {
  const files = fs.readdirSync(POS_DIR).filter(f => f.includes('Herbie') && f.includes('POS'));
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  for (const file of files) {
    console.log(`Processing ${file}...`);
    const { expenses, weekStart } = await parsePOSFile(path.join(POS_DIR, file));
    if (!weekStart) {
      console.log(`Could not find date for ${file}`);
      continue;
    }
    
    // One Stop (Supplier Invoice)
    if (expenses.oneStop > 0) {
      let oneStopSup = await prisma.supplier.findFirst({ where: { name: "One Stop", clientId } });
      if (oneStopSup) {
        await prisma.invoice.create({
          data: {
            clientId,
            is2025: false,
            supplierId: oneStopSup.id,
            type: 'supplier',
            invoiceDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000), // weekEnd
            amount: expenses.oneStop,
            fileName: file,
            filePath: file,
            fileType: 'application/pdf',
          }
        });
      }
    }

    // Petrol (Expense)
    if (expenses.petrol > 0) {
      await prisma.expense.create({
        data: {
          clientId,
          is2025: false,
          date: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000),
          category: 'utilities',
          amount: expenses.petrol,
          description: `Petrol Money (from POS ${file})`,
          period: 'weekly'
        }
      });
    }

    // Wages (Expense)
    if (expenses.wages > 0) {
      await prisma.expense.create({
        data: {
          clientId,
          is2025: false,
          date: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000),
          category: 'wages',
          amount: expenses.wages,
          description: `Wages (from POS ${file})`,
          period: 'weekly'
        }
      });
    }

    // Other Expense
    if (expenses.other > 0) {
      await prisma.expense.create({
        data: {
          clientId,
          is2025: false,
          date: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000),
          category: 'others',
          amount: expenses.other,
          description: `Other Expense (from POS ${file})`,
          period: 'weekly'
        }
      });
    }
    console.log(`Saved expenses for ${file}`);
  }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
