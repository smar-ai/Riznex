const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: 'Deliveroo' },
    include: { invoice: true }
  });

  console.log(`Found ${sales.length} Deliveroo sales.`);
  for (const sale of sales) {
    if (!sale.invoice || !sale.invoice.filePath) continue;

    const fullPath = path.join(process.cwd(), 'public', sale.invoice.filePath);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const dataBuffer = fs.readFileSync(fullPath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;

      // Extract Gross Sales
      let grossSales = sale.grossSales;
      const totalMatch = text.match(/Total\s*([\d,]+\.\d{2})/);
      if (totalMatch) {
        grossSales = parseFloat(totalMatch[1].replace(/,/g, ''));
      }

      // Restore netPaid from original OCR data
      let netPaid = sale.netPaid;
      if (sale.invoice && sale.invoice.ocrData) {
        try {
          const ocr = JSON.parse(sale.invoice.ocrData);
          if (ocr.netPaid !== undefined) {
            netPaid = ocr.netPaid;
          }
        } catch(e){}
      }

      // We actually need the correct math for Deliveroo:
      // Gross Sales + Delivery Fees (Additions) - Commission - VAT - Ad Fee = Net Paid
      
      // Look for the main table row with Gross, Comm, Vat, Net
      let commission = 0;
      let vat = 0;
      let adSpends = 0;
      let otherFees = 0;
      let refunds = 0;
      
      const summaryMatch = text.match(/Total\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})/);
      if (summaryMatch) {
        grossSales = parseFloat(summaryMatch[1].replace(/,/g, ''));
        commission = Math.abs(parseFloat(summaryMatch[3].replace(/,/g, '')));
        vat = Math.abs(parseFloat(summaryMatch[4].replace(/,/g, '')));
      }

      // Ad Fee
      const adFeeMatch = text.match(/Total\s+-?([\d,]+\.\d{2})\s+-?([\d,]+\.\d{2})\s+-?([\d,]+\.\d{2})/);
      if (adFeeMatch && adFeeMatch.index > (summaryMatch ? summaryMatch.index : 0)) {
        adSpends = Math.abs(parseFloat(adFeeMatch[1].replace(/,/g, '')));
        // VAT on ads is adFeeMatch[2], total ad fee is adFeeMatch[3]
        vat += Math.abs(parseFloat(adFeeMatch[2].replace(/,/g, '')));
      }
      
      otherFees = parseFloat((grossSales - commission - vat - adSpends + refunds - netPaid).toFixed(2));
      
      if (isNaN(otherFees)) otherFees = 0;

      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          grossSales,
          netPaid,
          commission,
          vat,
          adSpends,
          otherFees,
          refunds,
          topRankFee: 0,
          adminFee: 0,
          offersOnItems: 0,
          offerRedemptionFee: 0
        }
      });
      console.log(`Updated Deliveroo sale ${sale.id} - Gross: ${grossSales}, Net: ${netPaid}, Other: ${otherFees}`);
    } catch (e) {
      console.error(`Error processing ${sale.id}:`, e);
    }
  }
}
run().finally(() => prisma.$disconnect());
