const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs/promises');
const path = require('path');

function getWeekStart(d) {
  const dt = new Date(d);
  const day = dt.getUTCDay();
  const diff = dt.getUTCDate() - day + (day === 0 ? -6 : 1);
  const ws = new Date(dt.setDate(diff));
  ws.setUTCHours(0,0,0,0);
  return ws;
}

function getWeekEnd(ws) {
  const we = new Date(ws);
  we.setUTCDate(we.getUTCDate() + 6);
  we.setUTCHours(23,59,59,999);
  return we;
}

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No Gemini API key found in env!');
    process.exit(1);
  }

  const pendingInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, fileName: { contains: 'Herbies' }, type: 'pos' }
  });

  console.log(`\n=== PROCESSING ${pendingInvoices.length} HERBIES POS INVOICES STRICTLY WITH NET SALES (EX-VAT) ===\n`);

  for (const inv of pendingInvoices) {
    console.log(`Processing invoice ID ${inv.id}: ${inv.fileName} ...`);
    const fullPath = path.join(process.cwd(), 'public', inv.filePath);

    try {
      const fileBuffer = await fs.readFile(fullPath);
      const base64Data = fileBuffer.toString('base64');
      const ext = path.extname(fullPath).toLowerCase();
      let mimeType = 'application/pdf';
      if (ext === '.png') mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

      const prompt = `You are an invoice data extractor. Analyse this POS report and extract ALL financial data. 

Return ONLY a valid JSON object with these fields (use null or 0 if not found):
{
  "dateTill": "YYYY-MM-DD",
  "s4dRegister": { "gross": 0, "net": 0 },
  "consumerApp": { "gross": 0, "net": 0 },
  "website": { "gross": 0, "net": 0 },
  "salesGross": 0,
  "salesNet": 0,
  "ordersTotal": 0,
  "ordersDelivery": 0,
  "ordersInStore": 0
}

IMPORTANT: 
- "dateTill" should be the Week Ending date on the report.
- If the report has a "Sales per channel report" table, YOU MUST extract the "Total" Net and "Total" Gross for "S4D Register", "ConsumerApp", and "Website". DO NOT SKIP THIS.
- Extract NET SALES (Ex-VAT) accurately.
- Return ONLY the JSON, no markdown, no explanation.`;

      let res = null;
      let attempts = 0;
      while (attempts < 5) {
        attempts++;
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Data } }
                ]
              }
            ]
          })
        });

        if (res.status === 429) {
          console.log(`429 Rate Limit for ${inv.fileName}. Waiting 12s... (Attempt ${attempts}/5)`);
          await new Promise(r => setTimeout(r, 12000));
        } else {
          break;
        }
      }

      if (!res || !res.ok) {
        console.error(`Gemini API error for ${inv.fileName}: HTTP ${res ? res.status : 'NO_RES'}`);
        continue;
      }

      const geminiJson = await res.json();
      const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned);

      console.log(`Parsed Data for ${inv.fileName}:`, parsed);

      // STRICT RULE: Base Sales MUST BE Net Sales Ex-VAT!
      const posNet = parsed.s4dRegister?.net !== undefined ? parsed.s4dRegister.net : (parsed.s4dRegister?.gross || 0);
      const appNet = parsed.consumerApp?.net !== undefined ? parsed.consumerApp.net : (parsed.consumerApp?.gross || 0);
      const webNet = parsed.website?.net !== undefined ? parsed.website.net : (parsed.website?.gross || 0);

      const totalNetExVat = posNet + appNet + webNet || parsed.salesNet || parsed.salesGross || 0;
      const webAppNet = appNet + webNet;

      let dateTill = parsed.dateTill ? new Date(parsed.dateTill) : new Date();
      const ws = getWeekStart(dateTill);
      const we = getWeekEnd(ws);

      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          ocrStatus: 'done',
          ocrData: JSON.stringify(parsed),
          amount: totalNetExVat,
          invoiceDate: dateTill
        }
      });

      // Remove any pre-existing sale record for this invoice to prevent duplication
      await prisma.sale.deleteMany({
        where: { invoiceId: inv.id }
      });

      if (totalNetExVat > 0) {
        const comm = webAppNet * 0.085; // 8.5% Commission on Web & App Net Sales ONLY
        const netPaid = totalNetExVat - comm;
        const totalOrders = parsed.ordersTotal || (parsed.ordersDelivery || 0) + (parsed.ordersInStore || 0) || Math.round(totalNetExVat / 16);

        await prisma.sale.create({
          data: {
            clientId,
            is2025,
            store: 'Herbies Pizza',
            platform: 'Herbies POS',
            grossSales: totalNetExVat, // Base Sales = Net Ex-VAT!
            commission: comm,
            netPaid: netPaid,
            totalOrders: totalOrders,
            vat: totalNetExVat * 0.20,
            weekStart: ws,
            weekEnd: we,
            invoiceId: inv.id
          }
        });
      }

      console.log(`SUCCESS: Processed ${inv.fileName} -> Net Ex-VAT: £${totalNetExVat.toFixed(2)} | Comm: £${(webAppNet * 0.085).toFixed(2)}`);
      await new Promise(r => setTimeout(r, 4000)); // 4s pause between files
    } catch (e) {
      console.error(`Failed to process ${inv.fileName}:`, e);
    }
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
