import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getWeekStart, getWeekEnd } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");
    
    let mimeType = file.type;
    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    let extractedText = "";
    
    if (mimeType === 'application/pdf') {
      const fs = (await import('fs')).default;
      const util = (await import('util')).default;
      const { exec } = await import('child_process');
      const execAsync = util.promisify(exec);
      const os = (await import('os')).default;
      const tempPath = `${os.tmpdir()}/temp_${Date.now()}.pdf`;
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      
      const { stdout, stderr } = await execAsync(`node scripts/pdf-worker.js "${tempPath}"`);
      fs.unlinkSync(tempPath);
      
      try {
        const res = JSON.parse(stdout.trim());
        if (!res.success) throw new Error(res.error);
        extractedText = res.text;
      } catch (err: any) {
        return NextResponse.json({ error: "Failed to parse PDF: " + (stderr || err.message) }, { status: 500 });
      }
    } else {
      // Fallback for images (if they still upload the 1-page screenshot)
      const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "API key not configured for image uploads. Please upload a PDF instead." }, { status: 500 });

      const prompt = `Extract all text from this image exactly as it appears.`;
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }]
          })
        }
      );
      if (geminiRes.ok) {
        const geminiJson = await geminiRes.json();
        extractedText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        return NextResponse.json({ error: "Failed to parse image. Please upload a PDF." }, { status: 500 });
      }
    }

    // Parse the extracted text using Regex
    // Looking for: Total. £31.49 Place on 08 Jul 2026
    const regex = /Total[.\s:]*£([\d,.]+)(?:[\s\S]{0,50}?)Place[d]?\s*on\s*(\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4})/gi;
    let match;
    let ordersCount = 0;
    const weeklyData: Record<string, { weekStart: Date, weekEnd: Date, totalOrders: number, grossSales: number }> = {};

    while ((match = regex.exec(extractedText)) !== null) {
      const valueStr = match[1].replace(/,/g, '');
      const value = parseFloat(valueStr);
      const dateStr = match[2]; // "08 Jul 2026"
      
      const orderDate = new Date(dateStr);
      if (isNaN(orderDate.getTime())) continue;

      ordersCount++;

      const ws = getWeekStart(orderDate);
      const we = getWeekEnd(ws);
      const weekKey = ws.toISOString();

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekStart: ws,
          weekEnd: we,
          totalOrders: 0,
          grossSales: 0,
        };
      }
      weeklyData[weekKey].totalOrders += 1;
      weeklyData[weekKey].grossSales += value;
    }

    if (ordersCount === 0) {
      return NextResponse.json({ error: "No orders found in the document using the regex pattern." }, { status: 400 });
    }

    const clientId = session.user.role === 'admin' ? 'client-1' : session.user.clientId;

    // Upsert into Sales table
    let processedWeeks = 0;
    for (const data of Object.values(weeklyData)) {
      if (data.grossSales <= 0 && data.totalOrders <= 0) continue;

      // Check if a record already exists for this week, store, and platform
      const existingSale = await prisma.sale.findFirst({
        where: {
          clientId,
          store: 'Hungry Birds',
          platform: 'Website',
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
        }
      });

      if (existingSale) {
        // Add to existing
        await prisma.sale.update({
          where: { id: existingSale.id },
          data: {
            totalOrders: existingSale.totalOrders + data.totalOrders,
            grossSales: existingSale.grossSales + data.grossSales,
            netPaid: existingSale.netPaid + data.grossSales, // assuming 0 commission for these for now
          }
        });
      } else {
        // Create new
        await prisma.sale.create({
          data: {
            clientId,
            store: 'Hungry Birds',
            platform: 'Website',
            weekStart: data.weekStart,
            weekEnd: data.weekEnd,
            totalOrders: data.totalOrders,
            grossSales: data.grossSales,
            netPaid: data.grossSales, // net = gross initially
            commission: 0,
            vat: 0,
            notes: 'Imported via POS Order History PDF/Image'
          }
        });
      }
      processedWeeks++;
    }

    return NextResponse.json({ success: true, message: `Successfully processed ${ordersCount} orders across ${processedWeeks} weeks.` });

  } catch (error) {
    console.error('POS Upload Error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
