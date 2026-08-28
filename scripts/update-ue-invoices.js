const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const invoices = await prisma.invoice.findMany({
    where: { platform: { contains: 'Uber Eats' }, ocrStatus: 'success' },
    include: { sales: true }
  });

  console.log(`Found ${invoices.length} Uber Eats invoices to rescan...`);

  for (const invoice of invoices) {
    if (!invoice.fileUrl) continue;
    
    // Convert fileUrl to local path
    const relativePath = invoice.fileUrl.replace('/uploads/', '');
    const fullPath = path.join(process.cwd(), 'public', 'uploads', relativePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${fullPath}`);
      continue;
    }

    try {
      const dataBuffer = fs.readFileSync(fullPath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;

      const parsed = parseUberEatsInvoice(text);
      if (parsed.grossSales > 0 && invoice.sales.length > 0) {
        const saleId = invoice.sales[0].id;
        
        await prisma.sale.update({
          where: { id: saleId },
          data: {
            grossSales: parsed.grossSales,
            commission: parsed.commission || 0,
            vat: parsed.vat || 0,
            topRankFee: parsed.topRankFee || 0,
            adSpends: parsed.adSpends || 0,
            refunds: parsed.refunds || 0,
            netPaid: parsed.netPaid || 0,
            offersOnItems: parsed.offersOnItems || 0,
            offerRedemptionFee: parsed.offerRedemptionFee || 0,
            vatRoundingAdj: parsed.vatRoundingAdj || 0,
            otherPayments: parsed.otherPayments || 0,
            marketing: parsed.marketing || 0
          }
        });
        console.log(`Fixed Sale Record: ${invoice.fileName} (Net Paid: ${parsed.netPaid})`);
      }
    } catch (e) {
      console.error(`Error processing ${invoice.fileName}: ${e.message}`);
    }
  }
}

function parseUberEatsInvoice(text) {
  const result = {};
  const t = text.replace(/[\u2013\u2014\u2012\u2015]/g, "-");

  const earningsMatch = t.match(/Earnings[\s\S]{0,10}?[£$]\s*([\d,]+\.\d{2})/i);
  if (earningsMatch) result.grossSales = parseFloat(earningsMatch[1].replace(/,/g, ""));

  const uberFeesMatch = t.match(/Uber\s*Fees[\s\S]{0,5}?-?[£$]\s*([\d,]+\.\d{2})/i);
  const marketplaceFeeMatch = t.match(/Marketplace\s*Fee[\s\S]{0,5}?-?[£$]\s*([\d,]+\.\d{2})/i);
  if (marketplaceFeeMatch) result.commission = Math.abs(parseFloat(marketplaceFeeMatch[1].replace(/,/g, "")));
  else if (uberFeesMatch) result.commission = Math.abs(parseFloat(uberFeesMatch[1].replace(/,/g, "")));

  if (!result.commission) {
    const serviceMatch = t.match(/Service\s*fees?[\s\S]{0,5}?-?[£$]\s*([\d,]+\.\d{2})/i);
    if (serviceMatch) result.commission = Math.abs(parseFloat(serviceMatch[1].replace(/,/g, "")));
  }

  const refundMatch = t.match(/Net\s*Order\s*Error\s*Adjustments[\s\S]{0,10}?-?[£$]\s*([\d,]+\.\d{2})/i);
  if (refundMatch) result.refunds = Math.abs(parseFloat(refundMatch[1].replace(/,/g, "")));

  const payoutMatch = t.match(/Total\s*payout[\s\S]{0,10}?[£$]\s*([\d,]+\.\d{2})/i);
  if (payoutMatch) result.netPaid = parseFloat(payoutMatch[1].replace(/,/g, ""));

  const marketingTotalMatch = t.match(/^Marketing[\s\S]{0,8}?-?[£$]\s*([\d,]+\.\d{2})/im);
  if (marketingTotalMatch) result.marketing = Math.abs(parseFloat(marketingTotalMatch[1].replace(/,/g, "")));

  const offersMatch = t.match(/Offers\s*on\s*items[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i);
  if (offersMatch) result.offersOnItems = Math.abs(parseFloat(offersMatch[1].replace(/,/g, "")));

  const offerRedemptionMatch = t.match(/Offer\s*Redemption\s*Fee[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i);
  if (offerRedemptionMatch) result.offerRedemptionFee = Math.abs(parseFloat(offerRedemptionMatch[1].replace(/,/g, "")));

  const adSpendsMatch = t.match(/Ad\s*Spends?[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i);
  if (adSpendsMatch) result.adSpends = Math.abs(parseFloat(adSpendsMatch[1].replace(/,/g, "")));

  const vatRoundingMatch = t.match(/VAT\s*rounding\s*adjustment[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i);
  if (vatRoundingMatch) result.vatRoundingAdj = Math.abs(parseFloat(vatRoundingMatch[1].replace(/,/g, "")));

  const otherPaymentsMatch = t.match(/Other\s*payments[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i);
  if (otherPaymentsMatch) result.otherPayments = Math.abs(parseFloat(otherPaymentsMatch[1].replace(/,/g, "")));

  return result;
}

run().finally(() => prisma.$disconnect());
