require('dotenv').config({path: '.env'});
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const failedJJ = await prisma.invoice.findMany({
    where: { 
      supplier: { name: 'JJ Food Service' },
      amount: null
    }
  });

  console.log(`Waiting 65 seconds for Google AI limits to fully reset...`);
  await new Promise(resolve => setTimeout(resolve, 65000));
  
  for (const inv of failedJJ) {
    console.log(`Processing ${inv.fileName}...`);
    
    const parts = inv.filePath.split(/[\\/]/);
    const baseFilename = parts[parts.length - 1];
    let actualPath = `E:\\restaurant-dashboard\\public\\uploads\\${inv.clientId}\\${baseFilename}`;
    if (!fs.existsSync(actualPath)) actualPath = inv.filePath;
    if (!fs.existsSync(actualPath)) { console.log("Missing!"); continue; }

    const base64Data = fs.readFileSync(actualPath).toString('base64');
    const prompt = `You are an invoice data extractor. Analyse this supplier/wholesale invoice and extract the financial data.
          
Return ONLY a valid JSON object with exactly these fields. Use null if a value is missing:
{
  "invoiceDate": "YYYY-MM-DD",
  "totalVat": 0,
  "totalAmount": 0
}

IMPORTANT:
- Extract the FINAL TOTAL AMOUNT of the invoice. This is the most critical field.
- Extract the Invoice Date (not the Due Date).
- Ensure any strings are properly escaped to prevent JSON parse errors.
- Return ONLY valid JSON.`;

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
       const text = json.candidates[0].content.parts[0].text;
       try {
           const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
           const match = cleaned.match(/\{[\s\S]*\}/);
           const validJson = match ? match[0] : cleaned;
           const ocr = JSON.parse(validJson);
           
           if (ocr.totalAmount) {
              await prisma.invoice.update({
                  where: { id: inv.id },
                  data: { amount: ocr.totalAmount, notes: 'Fixed by AI retry' }
              });
              console.log(`=> SUCCESS: Extracted £${ocr.totalAmount}`);
           } else {
              console.log("=> FAIL: No totalAmount");
           }
       } catch (e) { console.log("=> FAIL: Could not parse JSON"); }
    } else {
       console.log("=> FAIL: API Error:", geminiRes.status);
    }
    
    // 15 second delay to strictly respect 15 RPM
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
