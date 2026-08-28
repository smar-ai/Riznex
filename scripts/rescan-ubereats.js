const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  const uberSales = await prisma.sale.findMany({
    where: { 
      is2025: false,
      platform: { contains: 'Uber Eats' },
      notes: { not: 'Fixed by Emergency Uber Eats OCR Rescan' }
    },
    include: { invoice: true }
  });

  console.log(`Found ${uberSales.length} 2026 Uber Eats sales records. Retriggering Gemini AI rescan...`);

  const prompt = `
You are extracting financial data from an Uber Eats payment statement PDF.
Carefully read the totals. Do NOT hallucinate.
Return ONLY a valid JSON object with the exact following keys, containing only numerical values (no currency symbols). 
If a value is not found, use 0. Ensure commission and fees are absolute positive numbers.

{
  "totalSales": <Gross total sales or Total Orders value>,
  "uberCommission": <The Service Fee / Uber Commission charged>,
  "additionalFees": <Any other negative deductions like marketing, sponsored listings, tablet fees>,
  "totalPayout": <The final Net Payout transferred to the bank>
}
`;

  let successCount = 0;
  let failCount = 0;

  for (const sale of uberSales) {
    if (!sale.invoice || !sale.invoice.filePath) {
      console.log(`Skipping Sale ID ${sale.id} - No invoice attached`);
      continue;
    }

    const pdfPath = path.join('public', sale.invoice.filePath);
    if (!fs.existsSync(pdfPath)) {
      console.log(`Skipping Sale ID ${sale.id} - PDF not found on disk`);
      continue;
    }

    const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
    console.log(`\nProcessing ${sale.invoice.fileName} (Sale ID: ${sale.id})...`);

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    const ext = path.extname(pdfPath).toLowerCase();
    let mimeType = 'application/pdf';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';

    // Trying gemini-3-flash-preview to bypass quota limits
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: pdfBase64 } }
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
           
           if (ocr.totalSales > 0) {
              await prisma.sale.update({
                  where: { id: sale.id },
                  data: { 
                    grossSales: ocr.totalSales,
                    commission: ocr.uberCommission,
                    topRankFee: ocr.additionalFees,
                    otherPayments: 0,
                    netPaid: ocr.totalPayout,
                    otherFees: 0, // Wipe out hallucinations
                    notes: 'Fixed by Emergency Uber Eats OCR Rescan'
                  }
              });
              console.log(`=> SUCCESS: Gross: ${ocr.totalSales}, Net: ${ocr.totalPayout}, Comm: ${ocr.uberCommission}, AddFees: ${ocr.additionalFees}`);
              successCount++;
           } else {
              console.log("=> FAIL: Extracted 0 for totalSales in JSON", validJson);
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
    
    // Wait 5 seconds to dodge rate limit
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log("\n--- RESCAN COMPLETE ---");
  console.log(`Successfully rescanned and updated: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
