import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { supabase } from "@/lib/supabase";
import { getWeekStart, getWeekEnd } from "@/lib/utils";
import util from "util";
import { exec } from "child_process";
const execAsync = util.promisify(exec);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // const session = await getServerSession(authOptions);
  // if (!session)
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice)
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Update status to processing
  await prisma.invoice.update({
    where: { id },
    data: { ocrStatus: "processing" },
  });

  let filePath = invoice.filePath;
  let isTempFile = false;
  try {
    if (invoice.filePath && invoice.filePath.includes('/invoices/')) {
      const bucketPath = invoice.filePath.split('/invoices/')[1];
      const { data, error } = await supabase.storage.from('invoices').download(bucketPath);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        filePath = path.join(os.tmpdir(), `temp_${Date.now()}_${path.basename(bucketPath)}`);
        await writeFile(filePath, buffer);
        isTempFile = true;
      }
    } else {
      filePath = path.join(process.cwd(), "public", invoice.filePath);
    }
    let extractedText = "";
    let geminiData: any = null;

    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const isBankStatementPdf = invoice.type === "pos" && (invoice.platform?.includes("Card") || invoice.fileName?.toLowerCase().includes("card") || invoice.fileName?.toLowerCase().includes("bank") || invoice.fileName?.toLowerCase().includes("walkin"));
    const isHungryBirdsPosPdf = (invoice.type === "pos" && invoice.fileType === "pdf" && invoice.platform?.includes("Hungry Birds")) || isBankStatementPdf;
    const isHerbiesPosPdf = invoice.type === "pos" && invoice.fileType === "pdf" && invoice.platform?.includes("Herbies");

    if (apiKey && !isHungryBirdsPosPdf && !isHerbiesPosPdf) {
      try {
        const fileBuffer = await readFile(filePath);
        const base64Data = fileBuffer.toString("base64");
        const ext = path.extname(filePath).toLowerCase();
        
        let mimeType = "image/jpeg";
        if (invoice.fileType === "pdf") {
          mimeType = "application/pdf";
        } else if (ext === ".png") {
          mimeType = "image/png";
        } else if (ext === ".webp") {
          mimeType = "image/webp";
        }

        const isTastyBun = invoice.platform?.includes("Tasty Bun") || false;

        let prompt = "";
        if (invoice.type === "supplier") {
          prompt = `You are an invoice data extractor. Analyse this supplier/wholesale invoice and extract the financial data.
          
Return ONLY a valid JSON object with exactly these fields. Use null if a value is missing:
{
  "invoiceDate": "YYYY-MM-DD",
  "totalVat": 0,
  "totalAmount": 0
}

IMPORTANT:
- Extract the FINAL TOTAL AMOUNT of the invoice. This is the most critical field. It is usually at the bottom next to "TOTAL" or "Amount Due" or "Total GBP Incl. VAT" or "Invoice Total".
- Extract the Invoice Date (not the Due Date).
- Use British format for ambiguous dates (e.g. 15-07-26 means 15th July 2026, NOT July 26th 2015).
- If the image is cut off or a value isn't found, output 0 for numbers.
- For missing dates, use null.
- DO NOT use markdown formatting, ONLY return JSON.`;
        } else if (invoice.type === "pos") {
          prompt = isTastyBun 
            ? `You are an invoice data extractor. Analyse this Tasty Bun "Aggregators Sales by Channel" report and extract the financial data.

Return ONLY a valid JSON object with these fields (use null or 0 if not found):
{
  "dateRange": "DD/MM/YYYY - DD/MM/YYYY",
  "andromedaPOS": { "sales": 0, "orders": 0 },
  "androweb": { "sales": 0, "orders": 0 },
  "app": { "sales": 0, "orders": 0 }
}

IMPORTANT:
- "dateRange" must be explicitly extracted from the top right corner.
- Extract ONLY the "Sales" and "Orders" rows for "Andromeda POS", "Androweb", and "APP". 
- IGNORE ALL OTHER CHANNELS (like Uber Eats, Just Eat, Total, etc.).
- All monetary values should be positive numbers.
- Return ONLY the JSON, no markdown, no explanation.`
            : `You are an invoice data extractor. Analyse this POS report and extract ALL financial data. 

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
  "ordersInStore": 0,
  "receipts": {
    "cash": 0,
    "pdq": 0,
    "webCard": 0
  },
  "expenses": {
    "oneStop": 0,
    "petrol": 0,
    "wages": 0,
    "other": 0
  },
  "isTastyBunAndromeda": false,
  "andromedaPOS": { "sales": 0, "orders": 0 },
  "androweb": { "sales": 0, "orders": 0 },
  "app": { "sales": 0, "orders": 0 }
}

IMPORTANT: 
- "dateTill" should be the Week Ending date on the report.
- If the report has a "Sales per channel report" table, YOU MUST extract the "Total" Net and "Total" Gross for "S4D Register", "ConsumerApp", and "Website". DO NOT SKIP THIS.
- Extract "ordersDelivery" and "ordersInStore" from the Order Amount row at the top.
- Extract any expenses listed (like One Stop, Petrol Money, Wages, etc.). If an expense isn't listed, put 0.
- If the invoice contains "Aggregators Sales by Channel", it is a Tasty Bun Andromeda report. You MUST set "isTastyBunAndromeda" to true, and extract the Net Sales (Sales £) and Orders for "Andromeda POS", "Androweb", and "APP" into the respective objects.
- All monetary values should be numbers.
- Return ONLY the JSON, no markdown, no explanation.`;
        } else {
          prompt = `You are an invoice data extractor. Analyse this Uber Eats / food delivery platform invoice screenshot and extract ALL financial data. 

Return ONLY a valid JSON object with these fields (use null if not found):
{
  "weekStart": "YYYY-MM-DD",
  "weekEnd": "YYYY-MM-DD",
  "totalOrders": number,
  "customers": number,
  "grossSales": number,
  "earnings": number,
  "marketing": number,
  "offersOnItems": number,
  "offerRedemptionFee": number,
  "adSpends": number,
  "adCredits": number,
  "commission": number,
  "uberFees": number,
  "marketplaceFee": number,
  "vat": number,
  "cashOrders": number,
  "vatRoundingAdj": number,
  "refunds": number,
  "netOrderErrorAdjustments": number,
  "otherPayments": number,
  "netPaid": number
}

IMPORTANT: 
- weekStart and weekEnd come from the date range shown at the top (e.g. "04/13/2026 - 04/19/2026" means weekStart="2026-04-13", weekEnd="2026-04-19")
- All monetary values should be POSITIVE numbers (absolute values), except otherFees which can be negative.
- IF IT IS AN UBER EATS INVOICE: grossSales = Earnings value, netPaid = Total payout value. For commissions, look for "Marketplace Fee" specifically. Do not confuse the top-level "Marketing" header with individual ad spends. Extract "Sponsored Listings" or "Marketing campaigns" into "adSpends", and "Top Rank" into "topRankFee". IMPORTANT: "refunds" MUST perfectly match the absolute value of "Net order error adjustments" (e.g. if it says -£19.98, refunds = 19.98). If "Net order error adjustments" is £0.00, refunds MUST be 0. NEVER put the "Total payout" into refunds.
- IF IT IS A JUST EAT INVOICE: Must extract "totalOrders". grossSales = "Total sales" value (usually found lower down), netPaid = "You will receive from Just Eat" value. DO NOT mix these up. You MUST ONLY extract 3 deductions: "commission", "adSpends" (Top Rank / Promoted placement / Sponsored / Ads), and "otherFees". If you see an "Admin Fee", "Delivery fee", or ANY other random deduction, you MUST bundle it into "otherFees". If there is a "Rebate" or credit, you must SUBTRACT it from "otherFees" (so otherFees = total random deductions - rebates). Top Rank and Promoted fees strictly go into "adSpends".
- IF IT IS A DELIVEROO INVOICE: totalOrders = number of orders (usually under "Total Orders"). grossSales = "Total Order Value", netPaid = "Total payable". For commission, extract the TOTAL "Deliveroo Commission" (Net + VAT). Put any "Marketer", "Ads", "Promoted", or "Sponsored" fees into "adSpends". Put any "Top Rank" fees into "topRankFee". Put all other "Additional Fees" into "otherFees", and "Additional Payments" into "otherPayments".
- CRITICAL MATH RULE: For Just Eat, the system requires that (grossSales - commission - adSpends - vat - cashOrders - otherFees) EXACTLY equals netPaid. You MUST bundle Admin Fee and all other unlisted deductions into "otherFees", and net them against any Rebates (e.g. 50 deduction - 10 rebate = 40 otherFees) to make this equation balance perfectly. For Uber Eats, use the full equation: (grossSales - commission + vatRoundingAdj - adSpends - topRankFee - adminFee - otherFees - offersOnItems - offerRedemptionFee + refunds) = netPaid. For Deliveroo: (grossSales - commission - adSpends - topRankFee - otherFees + otherPayments) EXACTLY equals netPaid. You MUST put the exact remainder of "Additional Fees" into "otherFees" to make this equation perfectly balance.
- Return ONLY the JSON, no markdown, no explanation`;
        }

        let geminiRes: Response | null = null;
        let retries = 0;
        const maxRetries = 5;
        let backoff = 10000; // Start with 10s backoff for 429

        while (retries < maxRetries) {
          geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
            }
          );

          if (geminiRes.status === 429) {
            console.log(`Gemini Rate Limit (429) hit. Retrying in ${backoff / 1000}s... (Attempt ${retries + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, backoff));
            retries++;
            backoff *= 1.5; // Exponential backoff (10s, 15s, 22.5s, 33s...)
          } else {
            break; // Break if success or a non-rate-limit error (e.g. 400)
          }
        }

        if (geminiRes && geminiRes.ok) {
          const geminiJson = await geminiRes.ok ? await geminiRes.json() : null;
          const rawText =
            geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const cleaned = rawText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          try {
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            const validJsonStr = jsonMatch ? jsonMatch[0] : cleaned;
            geminiData = JSON.parse(validJsonStr);
            
            if (
              invoice.type === "platform" &&
              !geminiData.grossSales &&
              !geminiData.earnings &&
              !geminiData.netPaid
            ) {
              console.error("Gemini returned empty platform data. Forcing fallback.");
              geminiData = null;
            } else {
              extractedText = `[Gemini Vision] ${JSON.stringify(geminiData)}`;
            }
          } catch {
            extractedText = rawText;
            console.error("Gemini failed to return valid JSON:", rawText);
          }
        } else if (geminiRes) {
          const errorText = await geminiRes.text();
          console.error("Gemini API Error:", geminiRes.status, errorText);
        } else {
          console.error("Gemini API Error: No response received");
        }
      } catch (geminiErr: any) {
        console.error(
          "Gemini Vision failed, falling back to local parsing:",
          geminiErr.message,
        );
      }
    }

    // FALLBACKS (If Gemini didn't succeed or API key was missing)
    if (!geminiData) {
      if (invoice.fileType === "pdf") {
        // PDF text extraction using standalone worker to avoid Next.js bundling crashes (bad XRef entry)
        const { stdout, stderr } = await execAsync(
          `node scripts/pdf-worker.js "${filePath}"`
        );
        try {
          const res = JSON.parse(stdout.trim());
          if (!res.success) throw new Error(res.error);
          extractedText = res.text;
        } catch (parseErr: any) {
          throw new Error("PDF Worker failed: " + (stderr || parseErr.message));
        }
      } else {
        // Tesseract OCR for images
        const { stdout, stderr } = await execAsync(
          `node scripts/ocr-worker.js "${filePath}"`,
        );
        try {
          const res = JSON.parse(stdout.trim());
          if (!res.success) throw new Error(res.error);
          extractedText = res.text;
        } catch (parseErr: any) {
          throw new Error(
            "Worker script failed: " + (stderr || parseErr.message),
          );
        }
      }
    }

    // --- BANK STATEMENT MULTI-WEEK PARSER FOR WALK-IN CARD PAYOUTS ---
    if (invoice.type === "pos" && (invoice.platform?.includes("Card") || invoice.fileName?.toLowerCase().includes("card") || invoice.fileName?.toLowerCase().includes("bank") || invoice.fileName?.toLowerCase().includes("walkin"))) {
      if (!extractedText && invoice.fileType === "pdf") {
        try {
          const { stdout } = await execAsync(`node scripts/pdf-worker.js "${filePath}"`);
          const res = JSON.parse(stdout.trim());
          if (res.success) extractedText = res.text;
        } catch (e) {
          console.error("PDF worker error:", e);
        }
      }

      if (extractedText) {
        const lines = extractedText.split("\n").map(l => l.trim()).filter(Boolean);
        const weeklySums: Record<string, { weekStart: Date, weekEnd: Date, total: number, itemsCount: number }> = {};
        const monthsMap: Record<string, number> = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11, january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11 };

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("US Bank Europe Dac") || lines[i].includes("EMS") || lines[i].includes("Card Transaction")) {
            let dateStr = "";
            for (let j = Math.max(0, i - 4); j <= i; j++) {
              const m = lines[j].match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
              if (m) {
                const mIdx = monthsMap[m[2].toLowerCase()];
                if (mIdx !== undefined) {
                  dateStr = `${m[3]}-${String(mIdx + 1).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
                  break;
                }
              }
            }

            let amount = 0;
            for (let k = i; k <= Math.min(lines.length - 1, i + 5); k++) {
              const matchAmt = lines[k].match(/(?:Paid in \(£\)|Fee \(£\):[^\n]*\n)?\s*([\d,]+\.\d{2})/);
              if (matchAmt && parseFloat(matchAmt[1].replace(/,/g, "")) > 0) {
                amount = parseFloat(matchAmt[1].replace(/,/g, ""));
                break;
              }
            }

            if (dateStr && amount > 0) {
              const dt = new Date(dateStr + "T12:00:00Z");
              const ws = getWeekStart(dt);
              const we = getWeekEnd(ws);
              const weekKey = we.toISOString().substring(0, 10);

              if (!weeklySums[weekKey]) {
                weeklySums[weekKey] = { weekStart: ws, weekEnd: we, total: 0, itemsCount: 0 };
              }
              weeklySums[weekKey].total += amount;
              weeklySums[weekKey].itemsCount += 1;
            }
          }
        }

        const weekEntries = Object.values(weeklySums);
        if (weekEntries.length > 0) {
          for (const entry of weekEntries) {
            const existingInv = await prisma.invoice.findFirst({
              where: { clientId: invoice.clientId, platform: "Walk-in Card", invoiceDate: entry.weekEnd }
            });
            let targetInvId = existingInv?.id;
            if (!existingInv) {
              const newInv = await prisma.invoice.create({
                data: {
                  clientId: invoice.clientId,
                  type: "pos",
                  platform: "Walk-in Card",
                  amount: entry.total,
                  invoiceDate: entry.weekEnd,
                  fileName: invoice.fileName,
                  filePath: invoice.filePath,
                  fileType: invoice.fileType,
                  ocrStatus: "done",
                  notes: `Extracted from bank statement: ${invoice.fileName}`
                }
              });
              targetInvId = newInv.id;
            } else {
              await prisma.invoice.update({
                where: { id: existingInv.id },
                data: { amount: entry.total, ocrStatus: "done" }
              });
            }

            const existingSale = await prisma.sale.findFirst({
              where: { clientId: invoice.clientId, platform: "Walk In Card", weekEnd: entry.weekEnd }
            });
            if (!existingSale) {
              await prisma.sale.create({
                data: {
                  clientId: invoice.clientId,
                  platform: "Walk In Card",
                  store: "Hungry Birds",
                  weekStart: entry.weekStart,
                  weekEnd: entry.weekEnd,
                  grossSales: entry.total,
                  netPaid: entry.total,
                  totalOrders: Math.round(entry.total / 20),
                  commission: 0,
                  vat: 0,
                  notes: `Auto-created from bank statement: ${invoice.fileName}`,
                  invoiceId: targetInvId,
                  is2025: false
                }
              });
            } else {
              await prisma.sale.update({
                where: { id: existingSale.id },
                data: { grossSales: entry.total, netPaid: entry.total }
              });
            }
          }

          const latestWeekEnd = weekEntries.reduce((max, curr) => curr.weekEnd > max ? curr.weekEnd : max, weekEntries[0].weekEnd);
          await prisma.invoice.update({
            where: { id },
            data: {
              ocrStatus: "done",
              invoiceDate: latestWeekEnd,
              amount: weekEntries.reduce((a, b) => a + b.total, 0),
              notes: `Parsed ${weekEntries.length} weekly card statement totals from bank statement`
            }
          });
          return NextResponse.json({ success: true, message: `Successfully extracted ${weekEntries.length} weekly card payout statements.` });
        }
      }
    }

    // --- POS PARSING FOR PDF ---
    if (invoice.type === "pos" && invoice.fileType === "pdf" && !geminiData) {
      if (invoice.platform?.includes("Hungry Birds")) {
        const regex = /Total[.\s:]*£([\d,.]+)(?:[\s\S]{0,50}?)Place[d]?\s*on\s*(\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4})(?:[\s\S]{0,30}?(Yesweb))?/gi;
        let match;
        let ordersCount = 0;
        const posWeeklyData: Record<string, { weekStart: Date, weekEnd: Date, totalOrders: number, grossSales: number }> = {};
        const webWeeklyData: Record<string, { weekStart: Date, weekEnd: Date, totalOrders: number, grossSales: number }> = {};
        let latestDate: Date | null = null;
        
        while ((match = regex.exec(extractedText)) !== null) {
           const valueStr = match[1].replace(/,/g, '');
           const value = parseFloat(valueStr);
           const dateStr = match[2];
           const isWeb = !!match[3];
           const orderDate = new Date(dateStr);
           if (isNaN(orderDate.getTime())) continue;
           ordersCount++;
           if (!latestDate || orderDate > latestDate) latestDate = orderDate;
           
           const ws = getWeekStart(orderDate);
           const we = getWeekEnd(ws);
           const weekKey = ws.toISOString();
           
           const targetData = isWeb ? webWeeklyData : posWeeklyData;
           if (!targetData[weekKey]) {
             targetData[weekKey] = { weekStart: ws, weekEnd: we, totalOrders: 0, grossSales: 0 };
           }
           targetData[weekKey].totalOrders += 1;
           targetData[weekKey].grossSales += value;
        }
        if (ordersCount > 0) {
           geminiData = {
             isHungryBirdsMultiWeek: true,
             posWeeklySales: Object.values(posWeeklyData),
             webWeeklySales: Object.values(webWeeklyData),
             invoiceDate: latestDate,
             grossSales: Object.values(posWeeklyData).reduce((sum, w) => sum + w.grossSales, 0) + Object.values(webWeeklyData).reduce((sum, w) => sum + w.grossSales, 0),
             totalOrders: ordersCount
           };
        }
      } else {
      // Use our custom parser for Herbies POS text
      const lines = extractedText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);
      geminiData = {
        dateTill: null,
        salesGross: 0,
        salesNet: 0,
        salesVat: 0,
        ordersTotal: 0,
        receipts: { cash: 0, pdq: 0, webCard: 0 },
        expenses: { oneStop: 0, petrol: 0, wages: 0, other: 0 },
      };

      const extractLastDecimal = (lineIdx: number) => {
        if (lineIdx < lines.length) {
          const match = lines[lineIdx].match(/[\d,]+\.\d{2}/g);
          if (match && match.length > 0) return parseFloat(match[match.length - 1].replace(/,/g, ""));
          return parseFloat(lines[lineIdx].replace(/[^\d.-]/g, "")) || 0;
        }
        return 0;
      };

      const extractLastInteger = (lineIdx: number) => {
        if (lineIdx < lines.length) {
          const match = lines[lineIdx].match(/\d+/g);
          if (match && match.length > 0) {
            return parseInt(match[match.length - 1], 10);
          }
        }
        return 0;
      };

      const dateTillMatch = extractedText.match(/Date till:\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (dateTillMatch) {
        geminiData.dateTill = dateTillMatch[1];
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("Order amount") && !line.includes("Average")) {
          // It could be on the same line or next line
          geminiData.ordersTotal = extractLastInteger(i);
          if (geminiData.ordersTotal === 0) geminiData.ordersTotal = extractLastInteger(i + 1);
        }
        if (line === "Total (gross)") {
          geminiData.salesGross = extractLastDecimal(i + 1);
          const parts = lines[i + 1].match(/[\d,]+\.\d{2}/g);
          if (parts && parts.length === 5) {
            geminiData.grossDelivery = parseFloat(parts[0].replace(/,/g, "")) + parseFloat(parts[1].replace(/,/g, ""));
            geminiData.grossInStore = parseFloat(parts[2].replace(/,/g, "")) + parseFloat(parts[3].replace(/,/g, ""));
          }
        }
        if (line === "Total VAT") {
          geminiData.salesVat = extractLastDecimal(i + 1);
          const parts = lines[i + 1].match(/[\d,]+\.\d{2}/g);
          if (parts && parts.length === 5) {
            geminiData.vatDelivery = parseFloat(parts[0].replace(/,/g, "")) + parseFloat(parts[1].replace(/,/g, ""));
            geminiData.vatInStore = parseFloat(parts[2].replace(/,/g, "")) + parseFloat(parts[3].replace(/,/g, ""));
          }
        }
        if (line === "Total net") {
          geminiData.salesNet = extractLastDecimal(i + 1);
          const parts = lines[i + 1].match(/[\d,]+\.\d{2}/g);
          if (parts && parts.length === 5) {
            geminiData.netDelivery = parseFloat(parts[0].replace(/,/g, "")) + parseFloat(parts[1].replace(/,/g, ""));
            geminiData.netInStore = parseFloat(parts[2].replace(/,/g, "")) + parseFloat(parts[3].replace(/,/g, ""));
          }
        }
        if (line === "Average order net") {
          const parts = lines[i + 1].match(/[\d,]+\.\d{2}/g);
          if (parts && parts.length >= 3) {
            let deliveryAvg = parseFloat(parts[0]);
            let inStoreAvg = parseFloat(parts[1]);
            if (parts.length === 5) {
              deliveryAvg = parseFloat(parts[1]);
              inStoreAvg = parseFloat(parts[3]);
            }
            if (deliveryAvg > 0 && geminiData.netDelivery) {
              geminiData.ordersDelivery = Math.round(geminiData.netDelivery / deliveryAvg);
            }
            if (inStoreAvg > 0 && geminiData.netInStore) {
              geminiData.ordersInStore = Math.round(geminiData.netInStore / inStoreAvg);
            }
          }
        }
        if (
          line === "Order amount" &&
          geminiData.ordersTotal === 0
        )
          geminiData.ordersTotal = parseInt(lines[i + 1].replace(/[^\d]/g, "")) || 1;

        if (line.toLowerCase() === "one stop" && i + 1 < lines.length)
          geminiData.expenses.oneStop = parseFloat(
            lines[i + 1].replace(/,/g, ""),
          );
        if (line.toLowerCase() === "petrol money" && i + 1 < lines.length)
          geminiData.expenses.petrol = parseFloat(
            lines[i + 1].replace(/,/g, ""),
          );
        if (line.toLowerCase() === "wages" && i + 1 < lines.length)
          geminiData.expenses.wages = parseFloat(
            lines[i + 1].replace(/,/g, ""),
          );
        if (line.toLowerCase() === "expense" && i + 1 < lines.length)
          geminiData.expenses.other = parseFloat(
            lines[i + 1].replace(/,/g, ""),
          );
      }
      const receiptsMatch = extractedText.match(
        /Receipts[\s\S]+?Total\n[\d,.]+/i,
      );
      if (receiptsMatch) {
        const cashMatch = receiptsMatch[0].match(/Cash\n([\d,.]+)/i);
        if (cashMatch)
          geminiData.receipts.cash = parseFloat(cashMatch[1].replace(/,/g, ""));
        const pdqMatch = receiptsMatch[0].match(/PDQ\n([\d,.]+)/i);
        if (pdqMatch)
          geminiData.receipts.pdq = parseFloat(pdqMatch[1].replace(/,/g, ""));
        const webCardMatch = receiptsMatch[0].match(/WebCard\n([\d,.]+)/i);
        if (webCardMatch)
          geminiData.receipts.webCard = parseFloat(
            webCardMatch[1].replace(/,/g, ""),
          );
      }

      // Convert date string to YYYY-MM-DD
      if (geminiData.dateTill && geminiData.dateTill.includes("/")) {
        const [day, month, year] = geminiData.dateTill.split("/");
        geminiData.dateTill = `${year}-${month}-${day}`;
      }
      }
    }

    // If Gemini returned structured data (or if we need to run regex fallbacks for POS), map it to ocrData
    let ocrData: any = {};
    if (geminiData || (invoice.type === "pos" && extractedText)) {
      geminiData = geminiData || {};
      if (invoice.type === "pos") {
        if (geminiData.isHungryBirdsMultiWeek) {
          ocrData = geminiData;
        } else if (invoice.platform?.includes("Tasty Bun")) {
          // Tasty Bun Andromeda mapping
          let ws = null;
          let we = null;
          if (geminiData.dateRange) {
            const parts = geminiData.dateRange.split(" - ");
            if (parts.length === 2) {
              const [d1, m1, y1] = parts[0].trim().split("/");
              const [d2, m2, y2] = parts[1].trim().split("/");
              if (y1 && m1 && d1) ws = new Date(`${y1}-${m1}-${d1}T00:00:00Z`);
              if (y2 && m2 && d2) we = new Date(`${y2}-${m2}-${d2}T23:59:59Z`);
            }
          }
          
          // Tasty Bun regex fallback
          const extractTastyBun = (name: string) => {
            if (!extractedText) return null;
            const idx = extractedText.indexOf(name);
            if (idx === -1) return null;
            const sub = extractedText.substring(Math.max(0, idx - 100), idx + 100);
            const salesMatch = sub.match(/Sales.*?£([0-9,.]+)/i);
            const ordersMatch = sub.match(/Orders.*?(\d+)/i);
            if (salesMatch && ordersMatch) {
              return { 
                sales: parseFloat(salesMatch[1].replace(/,/g, '')), 
                orders: parseInt(ordersMatch[1], 10) 
              };
            }
            return null;
          };

          const andromedaPOS = geminiData.andromedaPOS?.sales ? geminiData.andromedaPOS : extractTastyBun('Andromeda POS');
          const androweb = geminiData.androweb?.sales ? geminiData.androweb : extractTastyBun('Androweb');
          const app = geminiData.app?.sales ? geminiData.app : extractTastyBun('APP');

          const andromedaSales = andromedaPOS?.sales || 0;
          const androwebSales = androweb?.sales || 0;
          const appSales = app?.sales || 0;
          const totalGross = andromedaSales + androwebSales + appSales;

          ocrData = {
            weekStart: ws,
            weekEnd: we,
            invoiceDate: we,
            grossSales: totalGross,
            isTastyBunAndromeda: true,
            andromedaPOS: andromedaPOS,
            androweb: androweb,
            app: app,
          };
        } else {
          // Regex fallback for S4D channels if Gemini LLM omitted them
          const extractChannel = (name: string) => {
            if (!extractedText) return null;
            const idx = extractedText.indexOf(name);
            if (idx === -1) return null;
            const sub = extractedText.substring(idx, idx + 300);
            const matches = [...sub.matchAll(/£([0-9,.]+)/g)].map(m => parseFloat(m[1].replace(/,/g, '')));
            if (matches.length >= 10) {
              return { net: matches[8], gross: matches[9] };
            }
            return null;
          };

          const s4dRegister = geminiData.s4dRegister?.gross ? geminiData.s4dRegister : extractChannel('S4D Register');
          const consumerApp = geminiData.consumerApp?.gross ? geminiData.consumerApp : extractChannel('ConsumerApp');
          const website = geminiData.website?.gross ? geminiData.website : extractChannel('Website');

          // Herbies mapping
          ocrData = {
            invoiceDate: geminiData.dateTill,
            weekEnd: geminiData.dateTill
              ? new Date(geminiData.dateTill + "T23:59:59Z")
              : null,
            s4dRegister,
            consumerApp,
            website,
            grossSales: geminiData.salesNet ?? 0, // Set to Net Sales per user request
            netPaid: geminiData.salesNet ?? 0,
            vat: geminiData.salesVat ?? 0,
            totalOrders: geminiData.ordersTotal ?? 0,
            receipts: geminiData.receipts,
            posExpenses: geminiData.expenses,
            grossDelivery: geminiData.grossDelivery,
            grossInStore: geminiData.grossInStore,
            vatDelivery: geminiData.vatDelivery,
            vatInStore: geminiData.vatInStore,
            netDelivery: geminiData.netDelivery,
            netInStore: geminiData.netInStore,
            ordersDelivery: geminiData.ordersDelivery,
            ordersInStore: geminiData.ordersInStore,
          };
        }
      } else {
        // Map Gemini's structured output directly to our fields
        const ws = geminiData.weekStart
          ? new Date(geminiData.weekStart + "T00:00:00Z")
          : null;
        const we = geminiData.weekEnd
          ? new Date(geminiData.weekEnd + "T23:59:59Z")
          : null;
        ocrData = {
          weekStart: ws,
          weekEnd: we,
          invoiceDate: geminiData.invoiceDate || geminiData.weekEnd || null,
          totalAmount: geminiData.totalAmount,
          totalVat: geminiData.totalVat ?? 0,
          items: geminiData.items ?? [],
          totalOrders: geminiData.totalOrders ?? 0,
          customers: geminiData.customers ?? 0,
          grossSales: geminiData.grossSales ?? geminiData.earnings ?? 0,
          commission:
            geminiData.uberFees ??
            geminiData.commission ??
            geminiData.marketplaceFee ??
            0,
          marketing: geminiData.marketing ?? 0,
          offersOnItems: geminiData.offersOnItems ?? 0,
          offerRedemptionFee: geminiData.offerRedemptionFee ?? 0,
          adSpends: geminiData.adSpends ?? 0,
          adCredits: geminiData.adCredits ?? 0,
          vatRoundingAdj: geminiData.vatRoundingAdj ?? 0,
          refunds: Math.abs(
            geminiData.netOrderErrorAdjustments ?? geminiData.refunds ?? 0,
          ),
          otherPayments: geminiData.otherPayments ?? 0,
          netPaid: geminiData.netPaid ?? 0,
          topRankFee: 0,
          cashOrders: 0,
          otherFees: 0,
          adminFee: 0,
          vat: 0,
        };
      }
    } else {
      // Parse extracted text for key financial fields (Tesseract / PDF fallback)
      if (invoice.type === "supplier") {
        ocrData = parseSupplierInvoice(extractedText);
      } else if (invoice.platform?.includes("Uber Eats")) {
        ocrData = parseUberEatsInvoice(extractedText);
      } else if (invoice.platform?.includes("Just Eat")) {
        ocrData = parseJustEatInvoice(extractedText);
      } else if (invoice.platform?.includes("Deliveroo")) {
        ocrData = parseDeliverooInvoice(extractedText);
      } else {
        ocrData = parseInvoiceText(extractedText, invoice.platform);
      }
    }

    const finalAmount =
      ocrData.grossSales || ocrData.totalAmount || ocrData.receipts?.webCard || ocrData.receipts?.pdq || invoice.amount;
    const extractedDate = ocrData.invoiceDate
      ? new Date(ocrData.invoiceDate)
      : invoice.invoiceDate
        ? new Date(invoice.invoiceDate)
        : null;

    if (invoice.type === "supplier") {
      if (!finalAmount || !extractedDate) {
        throw new Error("AI failed to extract Date or Amount. Please enter manually.");
      }
    }

    // 2. Smart AI Data Detection (Cross-referencing)
    if (finalAmount && extractedDate) {
      const startOfDay = new Date(extractedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(extractedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const duplicate = await prisma.invoice.findFirst({
        where: {
          id: { not: id },
          clientId: invoice.clientId,
          type: invoice.type,
          platform: invoice.platform,
          supplierId: invoice.supplierId,
          amount: finalAmount,
          invoiceDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (duplicate) {
        await prisma.invoice.update({
          where: { id },
          data: {
            ocrStatus: "error",
            notes:
              "Duplicate detected by AI: Another invoice with the exact same Date, Supplier, and Amount already exists.",
          },
        });
        return NextResponse.json(
          { error: "Duplicate invoice detected by AI" },
          { status: 409 },
        );
      }
    }

    const parsedInvoiceDate = ocrData.invoiceDate
      ? new Date(ocrData.invoiceDate)
      : ocrData.weekStart
        ? new Date(ocrData.weekStart)
        : undefined;

    let finalInvoiceDate = parsedInvoiceDate;

    // Failsafe: Try to extract date from the filename if AI failed
    if (!finalInvoiceDate && invoice.fileName) {
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      
      const match = invoice.fileName.match(/([a-zA-Z]+)\s+(\d{1,2})/i);
      if (match) {
        const monthWord = match[1].toLowerCase();
        const day = parseInt(match[2], 10);
        
        let monthIndex = months.indexOf(monthWord);
        if (monthIndex === -1) monthIndex = shortMonths.indexOf(monthWord);
        
        if (monthIndex !== -1 && day >= 1 && day <= 31) {
          const currentYear = new Date().getUTCFullYear();
          finalInvoiceDate = new Date(Date.UTC(currentYear, monthIndex, day, 12, 0, 0));
          console.log(`[OCR FALLBACK] Extracted date ${finalInvoiceDate.toISOString()} from filename: ${invoice.fileName}`);
        }
      }
    }
    // Force 2025 year if flag is set
    if (invoice.is2025) {
      if (finalInvoiceDate) finalInvoiceDate.setUTCFullYear(2025);
      if (ocrData.weekStart && ocrData.weekStart instanceof Date) ocrData.weekStart.setUTCFullYear(2025);
      if (ocrData.weekEnd && ocrData.weekEnd instanceof Date) ocrData.weekEnd.setUTCFullYear(2025);
      if (ocrData.invoiceDate) {
        const d = new Date(ocrData.invoiceDate);
        d.setUTCFullYear(2025);
        ocrData.invoiceDate = d;
      }
    }


    // Update invoice in database
    const debugInfo = geminiData
      ? "SUCCESS"
      : `FAILED. RawText: ${extractedText?.substring(0, 500)}`;
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        ocrStatus: "done",
        ocrData: JSON.stringify({
          ...ocrData,
          rawText: extractedText?.substring(0, 2000) || "",
        }),
        amount: finalAmount,
        invoiceDate: finalInvoiceDate,
        notes: debugInfo,
      },
    });

    // Note: We no longer auto-create 'Expense' records for 'supplier' invoices
    // because Supplier invoices are now tracked directly via the Invoices table
    // and shown distinctly in the Combined Expenses Dashboard.

    // Auto-create Stock Count
    if (invoice.type === "stock" && finalAmount) {
      const stockDate = finalInvoiceDate || new Date();
      // Snap to weekend (Sunday)
      const weekStart = getWeekStart(stockDate);
      const weekEnd = getWeekEnd(weekStart);

      await prisma.stock.create({
        data: {
          clientId: invoice.clientId,
          weekEnd: weekEnd,
          value: finalAmount,
          franchise: invoice.platform || "Combined",
          notes: `Auto-created from stock count upload: ${invoice.fileName}`,
        },
      });
    }

    // Auto-create Sale or Expense linked records
    if (invoice.type === "platform" && invoice.platform) {
      const invoiceDate = ocrData.invoiceDate
        ? new Date(ocrData.invoiceDate)
        : new Date(invoice.invoiceDate || invoice.createdAt);
      const weekStart = ocrData.weekStart || getWeekStart(invoiceDate);
      const weekEnd = ocrData.weekEnd || getWeekEnd(weekStart);

      let storeName = "Combined";
      if (invoice.platform?.includes("Herbies")) storeName = "Herbies Pizza";
      if (invoice.platform?.includes("Tasty Bun")) storeName = "Tasty Bun";
      if (invoice.clientId === "client-1") storeName = "Hungry Birds";

      let parsedGross = ocrData.grossSales ?? ocrData.totalAmount ?? finalAmount ?? 0;
      let parsedNet = ocrData.netPaid ?? 0;

      // Fix OCR swapping Net and Gross
      if (parsedNet > parsedGross && parsedGross > 0) {
        const temp = parsedGross;
        parsedGross = parsedNet;
        parsedNet = temp;
      }

      let cleanPlatform = invoice.platform || "Unknown";
      if (cleanPlatform.includes("Herbies Pizza ")) cleanPlatform = cleanPlatform.replace("Herbies Pizza ", "");
      if (cleanPlatform.includes("Tasty Bun ")) cleanPlatform = cleanPlatform.replace("Tasty Bun ", "");
      if (cleanPlatform.includes("Hungry Birds ")) cleanPlatform = cleanPlatform.replace("Hungry Birds ", "");

      try {
        // Create linked Sale record
        await prisma.sale.create({
          data: {
            clientId: invoice.clientId,
            is2025: invoice.is2025,
            platform: cleanPlatform,
            store: storeName,
            weekStart,
            weekEnd,
            totalOrders: ocrData.totalOrders ?? 0,
            customers: ocrData.customers ?? 0,
            grossSales: parsedGross,
            commission: ocrData.commission ?? 0,
            vat: ocrData.vat ?? 0,
            adminFee: ocrData.adminFee ?? 0,
            topRankFee: ocrData.topRankFee ?? 0,
            refunds: ocrData.refunds ?? 0,
            cashOrders: ocrData.cashOrders ?? 0,
            otherFees: ocrData.otherFees ?? 0,
            netPaid: parsedNet,
            // Extended Uber Eats fields
            marketing: ocrData.marketing ?? 0,
            offersOnItems: ocrData.offersOnItems ?? 0,
            offerRedemptionFee: ocrData.offerRedemptionFee ?? 0,
            adSpends: ocrData.adSpends ?? 0,
            adCredits: ocrData.adCredits ?? 0,
            vatRoundingAdj: ocrData.vatRoundingAdj ?? 0,
            otherPayments: ocrData.otherPayments ?? 0,
            notes: `Auto-created from scanned invoice: ${invoice.fileName}`,
            invoiceId: invoice.id,
          },
        });
      } catch (saleErr: any) {
        // Sale creation failed (e.g. schema not updated) - try without extended fields
        try {
          await prisma.sale.create({
            data: {
              clientId: invoice.clientId,
            is2025: invoice.is2025,
              platform: cleanPlatform,
              store: storeName,
              weekStart,
              weekEnd,
              totalOrders: ocrData.totalOrders ?? 0,
              grossSales: parsedGross,
              commission: ocrData.commission ?? 0,
              vat: ocrData.vat ?? 0,
              adminFee: ocrData.adminFee ?? 0,
              topRankFee: ocrData.topRankFee ?? 0,
              refunds: ocrData.refunds ?? 0,
              cashOrders: ocrData.cashOrders ?? 0,
              otherFees: ocrData.otherFees ?? 0,
              netPaid: parsedNet,
              notes: `Auto-created from scanned invoice: ${invoice.fileName}`,
              invoiceId: invoice.id,
            },
          });
        } catch (fallbackErr: any) {
          console.error(
            "Sale create fallback also failed:",
            fallbackErr.message,
          );
          // Update invoice notes with the error but keep status as done
          await prisma.invoice.update({
            where: { id },
            data: {
              notes: `OCR succeeded but sale record creation failed: ${fallbackErr.message}`,
            },
          });
        }
      }
    } else if (invoice.type === "expense" && finalAmount) {
      const expenseDate = ocrData.invoiceDate
        ? new Date(ocrData.invoiceDate)
        : new Date(invoice.invoiceDate || invoice.createdAt);

      // Create linked Expense record
      await prisma.expense.create({
        data: {
          clientId: invoice.clientId,
          category: "misc",
          subcategory: invoice.platform || "Scanned Receipt",
          amount: finalAmount,
          period: "weekly",
          date: expenseDate,
          notes: `Auto-created from scanned receipt: ${invoice.fileName}`,
          invoiceId: invoice.id,
        },
      });
    } else if (invoice.type === "pos" && invoice.platform) {
      const expenseDate = ocrData.invoiceDate
        ? new Date(ocrData.invoiceDate)
        : new Date(invoice.invoiceDate || invoice.createdAt);
      const weekStart = ocrData.weekStart || getWeekStart(expenseDate);
      const weekEnd = ocrData.weekEnd || getWeekEnd(weekStart);
      const storeName = invoice.platform.replace(" POS", ""); // e.g. "Herbies Pizza"

      if (ocrData.isHungryBirdsMultiWeek) {
        // Multi-week sales records from Hungry Birds website POS
        const processWeeklyData = async (weeklyData: any[], platformName: string, commissionRate: number) => {
          for (const weekData of weeklyData) {
            const { weekStart: ws, weekEnd: we, totalOrders, grossSales } = weekData;
            if (grossSales === 0 && totalOrders === 0) continue;
            const commission = grossSales * commissionRate;
            const netPaid = grossSales - commission;
            
            const existingSale = await prisma.sale.findFirst({
              where: { clientId: invoice.clientId, store: storeName, platform: platformName, weekStart: ws, weekEnd: we }
            });
            if (existingSale) {
              await prisma.sale.update({
                where: { id: existingSale.id },
                data: {
                  totalOrders: existingSale.totalOrders + totalOrders,
                  grossSales: existingSale.grossSales + grossSales,
                  commission: existingSale.commission + commission,
                  netPaid: existingSale.netPaid + netPaid
                }
              });
            } else {
              await prisma.sale.create({
                data: {
                  clientId: invoice.clientId,
                  is2025: invoice.is2025,
                  platform: platformName,
                  store: storeName,
                  weekStart: ws,
                  weekEnd: we,
                  totalOrders,
                  grossSales,
                  netPaid,
                  commission,
                  vat: 0,
                  notes: `Auto-created from multi-week POS upload: ${invoice.fileName}`,
                  invoiceId: invoice.id
                }
              });
            }
          }
        };

        if (ocrData.webWeeklySales?.length > 0) {
          await processWeeklyData(ocrData.webWeeklySales, 'Hungry Birds Website', 0.085);
        }
        if (ocrData.posWeeklySales?.length > 0) {
          await processWeeklyData(ocrData.posWeeklySales, 'Hungry Birds POS', 0.0);
        }
      } else if (ocrData.isTastyBunAndromeda) {
        // Tasty Bun: Create 3 specific records
        const createTastyBunRecord = async (platformName: string, channelData: any) => {
          if (!channelData || (channelData.sales === 0 && channelData.orders === 0)) return;
          await prisma.sale.create({
            data: {
              clientId: invoice.clientId,
            is2025: invoice.is2025,
              platform: platformName,
              store: storeName,
              weekStart,
              weekEnd,
              totalOrders: channelData.orders || 0,
              grossSales: channelData.sales || 0,
              commission: channelData.sales * 0.04,
              vat: 0,
              netPaid: channelData.sales - (channelData.sales * 0.04),
              notes: `Auto-created from Tasty Bun Andromeda report: ${invoice.fileName}`,
              invoiceId: invoice.id,
            },
          });
        };

        await createTastyBunRecord(`${storeName} POS`, ocrData.andromedaPOS);
        await createTastyBunRecord(`${storeName} Website`, ocrData.androweb);
        await createTastyBunRecord(`${storeName} App`, ocrData.app);
      } else {
        // Herbies Pizza: Create Sales record for POS
        const hasS4D = ocrData.s4dRegister && (ocrData.s4dRegister.gross > 0 || ocrData.consumerApp?.gross > 0 || ocrData.website?.gross > 0);
        
        if (hasS4D) {
          // S4D Format
          const posNet = ocrData.s4dRegister?.net || 0;
          const posOrders = ocrData.ordersInStore || ocrData.s4dRegister?.orders || 0;
          const posCommission = 0; // 0% commission on S4D POS

          if (posNet > 0 || posOrders > 0) {
            await prisma.sale.create({
              data: {
                clientId: invoice.clientId,
            is2025: invoice.is2025,
                platform: 'Herbies POS',
                store: storeName,
                weekStart,
                weekEnd,
                totalOrders: posOrders,
                grossSales: posNet, // Net Sales!
                commission: posCommission,
                vat: 0,
                netPaid: posNet - posCommission,
                cashOrders: 0,
                otherPayments: 0,
                notes: `Auto-created from S4D Register: ${invoice.fileName}`,
                invoiceId: invoice.id,
              },
            });
          }

          const webNet = (ocrData.consumerApp?.net || 0) + (ocrData.website?.net || 0);
          const webOrders = ocrData.ordersDelivery || (ocrData.consumerApp?.orders || 0) + (ocrData.website?.orders || 0);
          const webCommission = webNet * 0.085; // 8.5% total commission
          const webOtherFees = 0; // Removing the 3.5% bank fee per user request

          if (webNet > 0 || webOrders > 0) {
            await prisma.sale.create({
              data: {
                clientId: invoice.clientId,
            is2025: invoice.is2025,
                platform: 'Herbies Web & App',
                store: storeName,
                weekStart,
                weekEnd,
                totalOrders: webOrders,
                grossSales: webNet, // Net Sales!
                commission: webCommission,
                otherFees: webOtherFees,
                vat: 0,
                netPaid: webNet - webCommission - webOtherFees,
                notes: `Auto-created from S4D ConsumerApp & Website: ${invoice.fileName}`,
                invoiceId: invoice.id,
              },
            });
          }
        } else if (ocrData.grossSales !== undefined || ocrData.totalOrders !== undefined) {
          // Fallback to old Herbies POS format
          const ordersWebsite = ocrData.ordersDelivery ?? 0;
          const websiteGross = ocrData.receipts?.webCard ?? 0;
          const websiteVat = websiteGross / 6; // Approximating 20% VAT
          const websiteNet = websiteGross - websiteVat;
          const websiteCommission = websiteNet * 0.085; // 8.5% commission (taken from net sales)
          const websiteOtherFees = 0; // Removing the 3.5% bank fee per user request

          const ordersPOS = ocrData.ordersInStore ?? ((ocrData.totalOrders ?? 0) - ordersWebsite);
          const posGross = (ocrData.grossSales ?? 0) - websiteGross;
          const posVat = (ocrData.vat ?? 0) - websiteVat;
          const posNet = (ocrData.netPaid ?? 0) - websiteNet;
          const posCommission = 0; // 0% commission from net sales

          await prisma.sale.create({
            data: {
              clientId: invoice.clientId,
            is2025: invoice.is2025,
              platform: invoice.platform,
              store: storeName,
              weekStart,
              weekEnd,
              totalOrders: ordersPOS,
              grossSales: posGross,
              commission: posCommission,
              vat: posVat,
              netPaid: posGross - posCommission,
              cashOrders: 0,
              otherPayments: 0,
              notes: `Auto-created from POS report: ${invoice.fileName}`,
              invoiceId: invoice.id,
            },
          });

          // Create Sales record for Herbies Website
          if (websiteGross > 0 || ordersWebsite > 0) {
            await prisma.sale.create({
              data: {
                clientId: invoice.clientId,
            is2025: invoice.is2025,
                platform: `${storeName} Website`,
                store: storeName,
                weekStart,
                weekEnd,
                totalOrders: ordersWebsite,
                grossSales: websiteGross,
                commission: websiteCommission,
                otherFees: websiteOtherFees,
                vat: websiteVat,
                netPaid: websiteGross - websiteCommission - websiteOtherFees,
                notes: `Auto-created from POS report WebCard/Delivery Orders: ${invoice.fileName}`,
                invoiceId: invoice.id,
              },
            });
          }
        }
      }

      // Distribute POS expenses if they exist
      if (ocrData.posExpenses) {
        const pExp = ocrData.posExpenses;

        // One Stop (Supplier Invoice)
        if (pExp.oneStop > 0) {
          // Find or create 'One Stop' supplier
          let oneStopSup = await prisma.supplier.findFirst({
            where: { name: "One Stop", clientId: invoice.clientId },
          });
          if (!oneStopSup) {
            oneStopSup = await prisma.supplier.create({
              data: {
                clientId: invoice.clientId,
                name: "One Stop",
                category: "food",
                franchise: "Combined",
              },
            });
          }
          await prisma.invoice.create({
            data: {
              clientId: invoice.clientId,
            is2025: invoice.is2025,
              type: "supplier",
              supplierId: oneStopSup.id,
              platform: storeName,
              amount: pExp.oneStop,
              invoiceDate: expenseDate,
              fileName: `Extracted from POS: ${invoice.fileName}`,
              filePath: invoice.filePath,
              fileType: invoice.fileType,
              ocrStatus: "done",
              notes: "Auto-created from POS report",
              sourceInvoiceId: invoice.id,
            },
          });
        }

        // Drivers Petrol (Expense -> 'fuel' category)
        if (pExp.petrol > 0) {
          await prisma.expense.create({
            data: {
              clientId: invoice.clientId,
            is2025: invoice.is2025,
              category: "fuel",
              subcategory: "Drivers Petrol",
              amount: pExp.petrol,
              period: "weekly",
              date: expenseDate,
              notes: `Auto-created from POS report: ${invoice.fileName}`,
              invoiceId: invoice.id,
            },
          });
        }

        // Other Expense
        if (pExp.other > 0) {
          await prisma.expense.create({
            data: {
              clientId: invoice.clientId,
            is2025: invoice.is2025,
              category: "misc",
              subcategory: "Other POS Expense",
              amount: pExp.other,
              period: "weekly",
              date: expenseDate,
              notes: `Auto-created from POS report: ${invoice.fileName}`,
              invoiceId: invoice.id,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: ocrData });
  } catch (err: any) {
    console.error("OCR ROUTE CRASHED:", err.stack);
    await prisma.invoice.update({
      where: { id },
      data: { ocrStatus: "error", notes: `CRASHED: ${err.message}` },
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (isTempFile && filePath) {
      try {
        await unlink(filePath);
      } catch (e) {
        console.error("Failed to delete temp file:", e);
      }
    }
  }
}

function parseSupplierInvoice(text: string) {
  const result: any = {};

  // --- DATE PARSING ---
  // Priority 1: "Invoice Date" label followed by DD/MM/YYYY (Herbies style)
  const invoiceDateSlash = text.match(
    /Invoice\s*Date[\s\S]{0,60}?(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  // Priority 2: "Delivery Date: 06/05/2026" (Express Foodservice style)
  const deliveryDateSlash = text.match(
    /Delivery\s*Date[\s:]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  // Priority 3: "Posting Date\n6. May 2026" or "6 May 2026" (word date format)
  const postingDateWord = text.match(
    /(?:Posting|Invoice)\s*Date[\s\S]{0,30}?(\d{1,2})[.\s]+([A-Za-z]+)\s+(\d{4})/i,
  );
  // Priority 4: Simple "Date    08/05/2026" (JJ Foodservice receipt style)
  const simpleDateField = text.match(/^Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/im);

  const parseSlashDDMMYYYY = (str: string) => {
    const parts = str.split("/");
    let year = parseInt(parts[2]);
    // Fix OCR misreading: 2026 → 2006, 2026 → 2016 etc. Any year before 2020 is wrong
    if (year < 2020) year = year + 20;
    if (year < 2020) year = 2026; // final fallback
    return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  };

  const monthMap: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };

  if (invoiceDateSlash) {
    result.invoiceDate = parseSlashDDMMYYYY(invoiceDateSlash[1]);
  } else if (deliveryDateSlash) {
    result.invoiceDate = parseSlashDDMMYYYY(deliveryDateSlash[1]);
  } else if (postingDateWord) {
    const mon = monthMap[postingDateWord[2].toLowerCase()];
    if (mon)
      result.invoiceDate = `${postingDateWord[3]}-${mon}-${postingDateWord[1].padStart(2, "0")}`;
  } else if (simpleDateField) {
    result.invoiceDate = parseSlashDDMMYYYY(simpleDateField[1]);
  } else {
    // Last resort: any DD/MM/YYYY date
    const anyDate = text.match(/(\d{2}\/\d{2}\/20\d{2})/);
    if (anyDate) result.invoiceDate = parseSlashDDMMYYYY(anyDate[1]);
  }

  // --- TOTAL AMOUNT PARSING ---
  const lines = text.split("\n");

  // Method 1: "Total GBP Incl. VAT  339.40" on same line (Express Foodservice)
  const totalInclVat = text.match(
    /Total\s+GBP\s+Incl\.?\s*VAT\s*[£$]?\s*([\d,]+\.\d{2})/i,
  );

  // Method 2: "TOTAL  £348.32" or "TOTAL  360.02" on same line (Herbies)
  const totalSameLine = text.match(/\bTOTAL\b\s*[£$]\s*([\d,]+\.\d{2})/i);

  // Method 3: JJ Food Service format: "298.83TOTAL0.00£ 298.83"
  // The final total appears AFTER "TOTAL" as "£ NNN.NN"
  const jjTotalFormat = text.match(/\bTOTAL[\d.,\s]*£\s*([\d,]+\.\d{2})/i);

  // Method 4: "Invoice Total" as column header — scan next lines for the last decimal number
  // N&B Foods: "... Invoice Total\n...\n0.00  52.98  0.00  52.98"
  let invoiceTotalFromHeader: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (/Invoice\s+Total/i.test(lines[i])) {
      // Scan next 3 lines for numbers, take last number from first line that has them
      for (let j = i + 1; j <= i + 3 && j < lines.length; j++) {
        const nums = lines[j].match(/[\d,]+\.\d{2}/g);
        if (nums && nums.length > 0) {
          invoiceTotalFromHeader = parseFloat(
            nums[nums.length - 1].replace(/,/g, ""),
          );
          break;
        }
      }
      break;
    }
  }

  // Method 5: "Amount Due £xxx"
  const amountDue = text.match(/Amount\s*Due\s*[£$]?\s*([\d,]+\.\d{2})/i);

  if (totalInclVat) {
    result.totalAmount = parseFloat(totalInclVat[1].replace(/[£$,]/g, ""));
  } else if (jjTotalFormat) {
    result.totalAmount = parseFloat(jjTotalFormat[1].replace(/,/g, ""));
  } else if (totalSameLine) {
    result.totalAmount = parseFloat(totalSameLine[1].replace(/,/g, ""));
  } else if (invoiceTotalFromHeader !== null) {
    result.totalAmount = invoiceTotalFromHeader;
  } else if (amountDue) {
    result.totalAmount = parseFloat(amountDue[1].replace(/,/g, ""));
  } else {
    const totalGbp = text.match(/Total\s+GBP\s*[£$]?\s*([\d,]+\.\d{2})/i);
    if (totalGbp) result.totalAmount = parseFloat(totalGbp[1].replace(/,/g, ""));
  }

  return result;
}

function parseInvoiceText(text: string, platform: string | null) {
  const result: any = {};

  // Generic patterns that work across Just Eat, Deliveroo, Uber Eats
  const patterns = {
    totalOrders: [
      /Number\s*of\s*orders\s*(\d+)/i,
      /total\s*orders?\s*:?\s*(\d+)/i,
      /no\.?\s*of\s*orders?\s*:?\s*(\d+)/i,
    ],
    totalAmount: [
      /Total\s*sales\s*[£$]?\s*([\d,]+\.?\d*)/i,
      /total\s*(sales?|revenue|amount|gross)\s*:?\s*[£$]?\s*([\d,]+\.?\d*)/i,
      /gross\s*(sales?|revenue)\s*:?\s*[£$]?\s*([\d,]+\.?\d*)/i,
      /subtotal\s*:?\s*[£$]?\s*([\d,]+\.?\d*)/i,
    ],
    commission: [
      /Commission[^£$]*[£$]\s*([\d,]+\.?\d*)\s*\n(?:.*?\(VAT.*?\))?\s*[£$]\s*([\d,]+\.?\d*)/i,
      /Commission[\s\S]{1,100}?(?:\n|\r)[£$]\s*([\d,]+\.?\d*)/i,
      /Commission.*?\n.*?[£$]\s*([\d,]+\.?\d*)/i,
      /service\s*fee\s*:?\s*[£$]?\s*([\d,]+\.?\d*)/i,
      /platform\s*fee\s*:?\s*[£$]?\s*([\d,]+\.?\d*)/i,
    ],
    vat: [
      /VAT\s*[£$]\s*([\d,]+\.?\d*)/i,
      /VAT£([\d,]+\.?\d*)/i,
      /tax\s*:?\s*[£$]?\s*([\d,]+\.?\d*)/i,
    ],
    netPaid: [
      /You\s*will\s*receive[\s\S]{1,50}?[£$]\s*([\d,]+\.?\d*)/i,
      /net\s*(payment|paid|payout)\s*:?\s*[£$]?\s*([\d,]+\.?\d*)/i,
      /Your\s*account\s*balance\s*[£$]\s*([\d,]+\.?\d*)/i,
    ],
    invoiceDate: [/Invoice\s*Date\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i],
  };

  for (const [field, pats] of Object.entries(patterns)) {
    for (const pat of pats) {
      const match = text.match(pat);
      if (match) {
        const val = match[match.length - 1].replace(/,/g, "");
        if (field === "totalOrders") result[field] = parseInt(val);
        else if (field === "invoiceDate") result[field] = val;
        else result[field] = parseFloat(val);
        break;
      }
    }
  }

  return result;
}

function parseJustEatInvoice(text: string) {
  const result: any = {};

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

  const cashMatch = text.match(/\d+\s+cash orders totalling[\s\n]+£([\d,]+\.?\d*)/i);
  if (cashMatch) result.cashOrders = parseFloat(cashMatch[1].replace(/,/g, ""));

  const commMatch = text.match(
    /14% Commission[\s\S]*?\)[\s\n]*£([\d,]+\.?\d*)/i,
  );
  if (commMatch) result.commission = parseFloat(commMatch[1].replace(/,/g, ""));

  const netMatch = text.match(/receive from Just Eat[\s\n]+£([\d,]+\.?\d*)/i);
  if (netMatch) result.netPaid = parseFloat(netMatch[1].replace(/,/g, ""));

  const vatMatch = text.match(/^VAT[\s\n]*£([\d,]+\.?\d*)/im);
  if (vatMatch) result.vat = parseFloat(vatMatch[1].replace(/,/g, ""));

  const lines = text.split("\n");
  let topRankTotal = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("Top Rank")) {
      const str = lines.slice(i, i + 3).join(" ");
      const m = str.match(/\)[\s]*£([\d,]+\.?\d*)/);
      if (m) topRankTotal += parseFloat(m[1].replace(/,/g, ""));
    }
  }

  if (topRankTotal > 0) result.adSpends = topRankTotal;
  
  // Consolidate everything else into otherFees
  result.otherFees = parseFloat((result.grossSales - (result.cashOrders || 0) - (result.commission || 0) - (result.adSpends || 0) - result.netPaid).toFixed(2));
  if (isNaN(result.otherFees)) result.otherFees = 0;

  return result;
}

function parseUberEatsInvoice(text: string) {
  const result: any = {};

  // Normalize: replace en-dash (–), em-dash (—), and similar unicode dashes with a regular hyphen
  const t = text.replace(/[\u2013\u2014\u2012\u2015]/g, "-");

  // --- DATE PARSING ---
  // Format: MM/DD/YYYY - MM/DD/YYYY (Uber Eats standard)
  const slashDateMatch = t.match(
    /(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/,
  );
  // Format: 30 Mar 2026 - 05 Apr 2026
  const wordDateMatch = t.match(
    /(\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  );

  const parseMDY = (dateStr: string) => {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const y = parts[2];
    
    // Default to DD/MM/YYYY for UK. Only use MM/DD/YYYY if middle part is > 12.
    if (p1 > 12) {
      // MM/DD/YYYY
      return new Date(
        `${y}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}T00:00:00Z`,
      );
    } else {
      // DD/MM/YYYY
      return new Date(
        `${y}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T00:00:00Z`,
      );
    }
  };

  if (slashDateMatch) {
    const ws = parseMDY(slashDateMatch[1]);
    const we = parseMDY(slashDateMatch[2]);
    if (ws) result.weekStart = ws;
    if (we) {
      we.setUTCHours(23, 59, 59, 999);
      result.weekEnd = we;
    }
  } else if (wordDateMatch) {
    result.weekStart = new Date(wordDateMatch[1].replace(/,/g, "") + " UTC");
    result.weekEnd = new Date(
      wordDateMatch[2].replace(/,/g, "") + " 23:59:59 UTC",
    );
  } else {
    const singleDate = t.match(
      /(\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/,
    );
    if (singleDate) result.invoiceDate = singleDate[1].replace(/,/g, "");
  }

  // --- FINANCIALS ---
  // Earnings (gross sales)
  const earningsMatch = t.match(/Earnings[\s\S]{0,10}?[£$]\s*([\d,]+\.\d{2})/i);
  if (earningsMatch)
    result.grossSales = parseFloat(earningsMatch[1].replace(/,/g, ""));

  // Uber Fees / Marketplace Fee → commission (prefer Marketplace Fee)
  const uberFeesMatch = t.match(
    /Uber\s*Fees[\s\S]{0,5}?-?[£$]\s*([\d,]+\.\d{2})/i,
  );
  const marketplaceFeeMatch = t.match(
    /Marketplace\s*Fee[\s\S]{0,5}?-?[£$]\s*([\d,]+\.\d{2})/i,
  );
  if (marketplaceFeeMatch)
    result.commission = Math.abs(
      parseFloat(marketplaceFeeMatch[1].replace(/,/g, "")),
    );
  else if (uberFeesMatch)
    result.commission = Math.abs(
      parseFloat(uberFeesMatch[1].replace(/,/g, "")),
    );

  // Service fees fallback
  if (!result.commission) {
    const serviceMatch = t.match(
      /Service\s*fees?[^\n£$]{0,10}-?[£$]\s*([\d,]+\.\d{2})/i,
    );
    if (serviceMatch)
      result.commission = Math.abs(
        parseFloat(serviceMatch[1].replace(/,/g, "")),
      );
  }

  // Net Order Error Adjustments → refunds
  const refundMatch = t.match(
    /Net\s*?order\s*error\s*adjustments[^\n£$]{0,30}-?[£$]\s*([\d,]+\.\d{2})/i,
  );
  if (refundMatch)
    result.refunds = Math.abs(parseFloat(refundMatch[1].replace(/,/g, "")));

  // Total payout → netPaid
  const payoutMatch = t.match(
    /Total\s*payout[^\n£$]{0,10}[£$]\s*([\d,]+\.\d{2})/i,
  );
  if (payoutMatch)
    result.netPaid = parseFloat(payoutMatch[1].replace(/,/g, ""));

  // Settled orders → totalOrders
  const settledMatch = t.match(/Settled\s*orders[\s\S]{0,5}?(\d+)/i);
  if (settledMatch) result.totalOrders = parseInt(settledMatch[1], 10);
  else {
    const lines = t.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].toLowerCase().includes("settled orders") &&
        i + 1 < lines.length
      ) {
        const nums = lines[i + 1].replace(/[£$][\d,.]+/g, "").match(/\b\d+\b/g);
        if (nums) result.totalOrders = parseInt(nums[nums.length - 1], 10);
        break;
      }
    }
  }

  // Customers
  const customersMatch = t.match(/Customers[\s\S]{0,5}?(\d+)/i);
  if (customersMatch) result.customers = parseInt(customersMatch[1], 10);

  // Marketing total
  const marketingTotalMatch = t.match(
    /^Marketing[\s\S]{0,8}?-?[£$]\s*([\d,]+\.\d{2})/im,
  );
  if (marketingTotalMatch)
    result.marketing = Math.abs(
      parseFloat(marketingTotalMatch[1].replace(/,/g, "")),
    );

  // Offers on items (incl. VAT)
  const offersMatch = t.match(
    /Offers\s*on\s*items[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i,
  );
  if (offersMatch)
    result.offersOnItems = Math.abs(
      parseFloat(offersMatch[1].replace(/,/g, "")),
    );

  // Offer Redemption Fee (incl. VAT)
  const offerRedemptionMatch = t.match(
    /Offer\s*Redemption\s*Fee[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i,
  );
  if (offerRedemptionMatch)
    result.offerRedemptionFee = Math.abs(
      parseFloat(offerRedemptionMatch[1].replace(/,/g, "")),
    );

  // Ad Spends
  const adSpendsMatch = t.match(
    /Ad\s*Spends?[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i,
  );
  if (adSpendsMatch)
    result.adSpends = Math.abs(parseFloat(adSpendsMatch[1].replace(/,/g, "")));

  // Ad Credits
  const adCreditsMatch = t.match(
    /Ad\s*Credits?[^£$\n]*[£$]\s*([\d,]+\.\d{2})/i,
  );
  if (adCreditsMatch)
    result.adCredits = parseFloat(adCreditsMatch[1].replace(/,/g, ""));

  // VAT rounding adjustment
  const vatRoundingMatch = t.match(
    /VAT\s*rounding\s*adjustment[^£$\n]*[£$]\s*-?([\d,]+\.\d{2})/i,
  );
  if (vatRoundingMatch)
    result.vatRoundingAdj = Math.abs(
      parseFloat(vatRoundingMatch[1].replace(/,/g, "")),
    );

  // Other payments
  const otherPaymentsMatch = t.match(
    /Other\s*payments?[^£$\n]*[£$]\s*([\d,]+\.\d{2})/i,
  );
  if (otherPaymentsMatch)
    result.otherPayments = parseFloat(otherPaymentsMatch[1].replace(/,/g, ""));

  // VAT rounding / other adjustments → otherFees
  const adjustMatch = t.match(/adjustment[^£$\n]*[£$]\s*([\d,]+\.\d{2})/i);
  if (adjustMatch)
    result.otherFees = Math.abs(parseFloat(adjustMatch[1].replace(/,/g, "")));

  return result;
}

function parseDeliverooInvoice(text: string) {
  const result: any = {};

  const issueMatch = text.match(/Issue date:.*?(\d{4})/i);
  const yr = issueMatch ? issueMatch[1] : new Date().getFullYear();
  const dateMatch = text.match(
    /Period covered:.*?,?\s*(\d{1,2}\s+[A-Za-z]+).*?-\s*.*?,?\s*(\d{1,2}\s+[A-Za-z]+)/i,
  );
  if (dateMatch) {
    result.weekStart = new Date(dateMatch[1] + ` ${yr} UTC`);
    result.weekEnd = new Date(dateMatch[2] + ` ${yr} 23:59:59 UTC`);
  }

  const salesMatch = text.match(/Total Order Value——£([\d,]+\.?\d*)/i);
  if (salesMatch)
    result.grossSales = parseFloat(salesMatch[1].replace(/,/g, ""));

  const netMatch =
    text.match(/Total payable to site——£([\d,]+\.?\d*)/i) ||
    text.match(/Total payable to.*?——£([\d,]+\.?\d*)/i);
  if (netMatch) result.netPaid = parseFloat(netMatch[1].replace(/,/g, ""));

  let totalOrders = 0;
  const pickupMatch = text.match(/Pickup(\d+)£/i);
  if (pickupMatch) totalOrders += parseInt(pickupMatch[1], 10);
  const marketMatch = text.match(/Marketplace\+(\d+)£/i);
  if (marketMatch) totalOrders += parseInt(marketMatch[1], 10);
  if (totalOrders > 0) result.totalOrders = totalOrders;

  const commMatch = text.match(
    /Deliveroo Commission£-?([\d,.]+)£-?([\d,.]+)£-?([\d,.]+)/i,
  );
  if (commMatch) result.commission = parseFloat(commMatch[3].replace(/,/g, ""));

  const netChargesMatch = text.match(
    /Deliveroo net charges£-?([\d,.]+)£-?([\d,.]+)£-?([\d,.]+)/i,
  );
  if (netChargesMatch)
    result.vat = parseFloat(netChargesMatch[2].replace(/,/g, ""));

  const marketerMatch = text.match(/Marketer Adverts\d+£-?([\d,]+\.?\d*)/i);
  if (marketerMatch)
    result.topRankFee = Math.abs(
      parseFloat(marketerMatch[1].replace(/,/g, "")),
    );

  let refunds = 0;
  const custRefundMatch = text.match(/Customer refund\d+£-?([\d,]+\.?\d*)/i);
  if (custRefundMatch)
    refunds += Math.abs(parseFloat(custRefundMatch[1].replace(/,/g, "")));
  const voucherMatch = text.match(
    /Restaurant funded voucher promotion\d+£-?([\d,]+\.?\d*)/i,
  );
  if (voucherMatch)
    refunds += Math.abs(parseFloat(voucherMatch[1].replace(/,/g, "")));
  if (refunds > 0) result.refunds = refunds;

  let otherFees = 0;
  const bagFeeMatch = text.match(/Bag fee\d+£-?([\d,]+\.?\d*)/i);
  if (bagFeeMatch)
    otherFees += Math.abs(parseFloat(bagFeeMatch[1].replace(/,/g, "")));
  const deliveryFeeMatch = text.match(
    /Marketplace\+ delivery fee\d+£-?([\d,]+\.?\d*)/i,
  );
  if (deliveryFeeMatch)
    otherFees += Math.abs(parseFloat(deliveryFeeMatch[1].replace(/,/g, "")));
  if (otherFees > 0) result.otherFees = otherFees;

  return result;
}
// force recompile - braces fixed
