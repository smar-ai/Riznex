require('dotenv').config({path: '.env'});
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  const deliverooSales = await prisma.sale.findMany({
    where: { 
      is2025: false,
      platform: { contains: 'Deliveroo' },
      notes: { not: 'Fixed by Emergency Deliveroo OCR Rescan' }
    },
    include: { invoice: true }
  });

  console.log(`Found ${deliverooSales.length} 2026 Deliveroo sales records. Retriggering Gemini AI rescan...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const sale of deliverooSales) {
    if (!sale.invoice || !sale.invoice.filePath) {
      console.log(`Skipping sale ${sale.id} - No invoice attached.`);
      failCount++;
      continue;
    }

    const inv = sale.invoice;
    console.log(`\nProcessing ${inv.fileName} (Sale ID: ${sale.id})...`);
    
    // Resolve file path
    const parts = inv.filePath.split(/[\\/]/);
    const baseFilename = parts[parts.length - 1];
    let actualPath = path.join(process.cwd(), 'public', 'uploads', inv.clientId, baseFilename);
    if (!fs.existsSync(actualPath)) {
      actualPath = path.join(process.cwd(), 'public', inv.filePath);
    }
    
    if (!fs.existsSync(actualPath)) {
        console.log("=> FAIL: File missing! path:", actualPath); 
        failCount++;
        continue;
    }

    const base64Data = fs.readFileSync(actualPath).toString('base64');
    const prompt = `You are an invoice data extractor. Analyse this Deliveroo Payment Statement and extract the financial data.
          
Return ONLY a valid JSON object with exactly these fields. Use exactly the numbers printed on the invoice without ANY mathematical adjustments. All numbers must be positive numbers (convert negative signs to positive). If a field is missing, use 0:
{
  "totalOrderValue": 0,
  "deliverooCommission": 0,
  "additionalFees": 0,
  "additionalPayments": 0,
  "totalPayable": 0
}

IMPORTANT:
- "totalOrderValue" should be the "Total Order Value" printed on the page.
- "deliverooCommission" should be the "Deliveroo Commission" Total (including VAT).
- "additionalFees" should be the "Additional Fees" Total (including VAT).
- "additionalPayments" should be the "Additional Payments" Total (Credits).
- "totalPayable" should be the "Total payable to" at the bottom.
- Return ONLY valid JSON.`;

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'application/pdf', data: base64Data } }
              ]
            }
          ]
        })
      }
    );

    if (geminiRes.ok) {
       const json = await geminiRes.json();
       let text = "";
       try {
           text = json.candidates[0].content.parts[0].text;
           const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
           const match = cleaned.match(/\{[\s\S]*\}/);
           const validJson = match ? match[0] : cleaned;
           const ocr = JSON.parse(validJson);
           
           if (ocr.totalOrderValue > 0) {
              await prisma.sale.update({
                  where: { id: sale.id },
                  data: { 
                    grossSales: ocr.totalOrderValue,
                    commission: ocr.deliverooCommission,
                    topRankFee: ocr.additionalFees,
                    otherPayments: ocr.additionalPayments,
                    netPaid: ocr.totalPayable,
                    otherFees: 0, // Wipe out hallucinations
                    notes: 'Fixed by Emergency Deliveroo OCR Rescan'
                  }
              });
              console.log(`=> SUCCESS: Gross: ${ocr.totalOrderValue}, Net: ${ocr.totalPayable}, Comm: ${ocr.deliverooCommission}, AddFees: ${ocr.additionalFees}, Credits: ${ocr.additionalPayments}`);
              successCount++;
           } else {
              console.log("=> FAIL: Extracted 0 for totalOrderValue in JSON", validJson);
              failCount++;
           }
       } catch (e) {
           console.log("=> FAIL: Could not parse JSON", text);
           failCount++;
       }
    } else {
       console.log("=> FAIL: API Error:", geminiRes.status, await geminiRes.text());
       failCount++;
    }
    
    // Wait 30 seconds to strictly dodge the per-minute rate limit
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  
  console.log("\n--- RESCAN COMPLETE ---");
  console.log(`Successfully rescanned and updated: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
