const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

function parseJustEatInvoice(text) {
  const result = {};

  const dateMatch = text.match(
    /(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*(?:-|to)\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  );
  if (dateMatch) {
    result.weekStart = new Date(dateMatch[1] + " UTC");
    result.weekEnd = new Date(dateMatch[2] + " 23:59:59 UTC");
  }

  const ordersMatch = text.match(/Number of orders\s+(\d+)/i);
  if (ordersMatch) result.totalOrders = parseInt(ordersMatch[1], 10);

  const salesMatch = text.match(/Total sales[\s\n]+£([\d,]+\.?\d*)/i);
  if (salesMatch)
    result.grossSales = parseFloat(salesMatch[1].replace(/,/g, ""));

  const commMatch = text.match(
    /14% Commission[\s\S]*?\)[\s\n]*£([\d,]+\.?\d*)/i,
  );
  if (commMatch) result.commission = parseFloat(commMatch[1].replace(/,/g, ""));

  const netMatch = text.match(/receive from Just Eat[\s\n]+£([\d,]+\.?\d*)/i);
  if (netMatch) result.netPaid = parseFloat(netMatch[1].replace(/,/g, ""));

  const vatMatch = text.match(/^VAT[\s\n]*£([\d,]+\.?\d*)/im);
  if (vatMatch) result.vat = parseFloat(vatMatch[1].replace(/,/g, ""));

  let adminTotal = 0;
  let topRankTotal = 0;
  let refundTotal = 0;

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("Admin Fee")) {
      const str = lines.slice(i, i + 3).join(" ");
      const m = str.match(/\)[\s\n]*£([\d,]+\.?\d*)/);
      if (m) adminTotal += parseFloat(m[1].replace(/,/g, ""));
    }

    if (line.includes("Top Rank")) {
      const str = lines.slice(i, i + 3).join(" ");
      const m = str.match(/\)[\s\n]*£([\d,]+\.?\d*)/);
      if (m) topRankTotal += parseFloat(m[1].replace(/,/g, ""));
    }
  }

  if (adminTotal > 0) result.adminFee = adminTotal;
  if (topRankTotal > 0) result.topRankFee = topRankTotal;
  if (topRankTotal > 0) result.adSpends = topRankTotal;

  return result;
}

async function run() {
  const invs = await prisma.invoice.findMany({
    where: { platform: { contains: 'Just Eat' }, invoiceDate: { gte: new Date('2026-06-25T00:00:00.000Z') } },
    include: { sales: true }
  });

  for (const inv of invs) {
    if (!inv.ocrData) continue;
    let ocrObj;
    try {
      ocrObj = JSON.parse(inv.ocrData);
    } catch(e) { continue; }

    const rawText = ocrObj.rawText;
    if (!rawText) continue;

    let textToParse = rawText;
    if (rawText.startsWith("[Gemini Vision]")) {
       // get the pdf parse text directly because Gemini raw text only contains JSON
       const pdfParse = require("pdf-parse");
       try {
         const data = fs.readFileSync("E:/restaurant-dashboard/public" + inv.filePath);
         const pdfData = await pdfParse(data);
         textToParse = pdfData.text;
       } catch(e) {
         console.log("Failed reading PDF for", inv.fileName);
         continue;
       }
    }

    const data = parseJustEatInvoice(textToParse);
    if (!data.grossSales || !data.netPaid) {
      console.log("Failed to parse", inv.fileName);
      continue;
    }

    console.log(`Fixing ${inv.fileName}: Gross=${data.grossSales}, Net=${data.netPaid}, Comm=${data.commission}, VAT=${data.vat}, Ads=${data.adSpends}, Admin=${data.adminFee}`);

    // Update Sales
    for (const sale of inv.sales) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          grossSales: data.grossSales,
          netPaid: data.netPaid,
          commission: data.commission || 0,
          vat: data.vat || 0,
          topRankFee: data.topRankFee || 0,
          adSpends: data.adSpends || 0,
          adminFee: data.adminFee || 0,
          otherFees: data.adminFee || 0,
          totalOrders: data.totalOrders || sale.totalOrders
        }
      });
    }

    // Update Invoice Amount to the correct Gross Sales
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        amount: data.grossSales
      }
    });
  }
}

run().finally(() => prisma.$disconnect());
