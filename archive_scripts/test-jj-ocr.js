require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { fileName: 'Supplier JJ Foods June 29.pdf' }
  });

  if (!inv) return console.log("Not found");
  
  // Use the new path if uploaded locally
  const parts = inv.filePath.split(/[\\/]/);
  const baseFilename = parts[parts.length - 1];
  let actualPath = `E:\\restaurant-dashboard\\public\\uploads\\${inv.clientId}\\${baseFilename}`;
  
  if (!fs.existsSync(actualPath)) {
     // fallback if they are absolute
     if (fs.existsSync(inv.filePath)) {
         actualPath = inv.filePath;
     } else {
         return console.log("File completely missing:", inv.filePath);
     }
  }

  const base64Data = fs.readFileSync(actualPath).toString('base64');
  
  const prompt = `You are an invoice data extractor. Analyse this supplier/wholesale invoice and extract the financial data.
          
Return ONLY a valid JSON object with exactly these fields. Use null if a value is missing:
{
  "invoiceDate": "YYYY-MM-DD",
  "totalVat": 0,
  "totalAmount": 0
}

IMPORTANT:
- Extract the FINAL TOTAL AMOUNT of the invoice. This is the most critical field. It is usually at the bottom next to "TOTAL" or "Amount Due" or "Total GBP Incl. VAT" or "Invoice Total".
- Extract the Invoice Date (not the Due Date).
- Ensure any strings are properly escaped to prevent JSON parse errors.
- Return ONLY valid JSON. Do not include markdown formatting or the word \`\`\`json. Just the raw JSON object.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

  const text = await geminiRes.text();
  console.log("STATUS:", geminiRes.status);
  console.log("RESPONSE:", text);
}

main().catch(console.error).finally(() => prisma.$disconnect());
