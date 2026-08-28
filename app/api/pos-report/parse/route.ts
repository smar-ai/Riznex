import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const result = {
      dateTill: null as string | null,
      salesGross: 0,
      salesNet: 0,
      salesVat: 0,
      ordersTotal: 0,
      receipts: {
        cash: 0,
        pdq: 0,
        webCard: 0
      },
      expenses: {
        oneStop: 0,
        petrol: 0,
        wages: 0,
        other: 0
      }
    };

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'Date till:' && i + 1 < lines.length) {
        result.dateTill = lines[i + 1];
      }
      
      if (line === 'Total (gross)' && i + 5 < lines.length) {
        result.salesGross = parseFloat(lines[i + 5].replace(/,/g, ''));
      }
      
      if (line === 'Total VAT' && i + 5 < lines.length) {
        result.salesVat = parseFloat(lines[i + 5].replace(/,/g, ''));
      }
      
      if (line === 'Total net' && i + 5 < lines.length) {
        result.salesNet = parseFloat(lines[i + 5].replace(/,/g, ''));
      }
      
      if (line === 'Order amount' && i + 5 < lines.length && result.ordersTotal === 0) {
        result.ordersTotal = parseInt(lines[i + 5].replace(/,/g, ''));
      }
      
      if (line.toLowerCase() === 'one stop' && i + 1 < lines.length) {
        result.expenses.oneStop = parseFloat(lines[i + 1].replace(/,/g, ''));
      }
      if (line.toLowerCase() === 'petrol money' && i + 1 < lines.length) {
        result.expenses.petrol = parseFloat(lines[i + 1].replace(/,/g, ''));
      }
      if (line.toLowerCase() === 'wages' && i + 1 < lines.length) {
        result.expenses.wages = parseFloat(lines[i + 1].replace(/,/g, ''));
      }
      if (line.toLowerCase() === 'expense' && i + 1 < lines.length) {
        result.expenses.other = parseFloat(lines[i + 1].replace(/,/g, ''));
      }
    }

    const receiptsMatch = text.match(/Receipts[\s\S]+?Total\n[\d,.]+/i);
    if (receiptsMatch) {
      const receiptsText = receiptsMatch[0];
      const cashMatch = receiptsText.match(/Cash\n([\d,.]+)/i);
      if (cashMatch) result.receipts.cash = parseFloat(cashMatch[1].replace(/,/g, ''));
      
      const pdqMatch = receiptsText.match(/PDQ\n([\d,.]+)/i);
      if (pdqMatch) result.receipts.pdq = parseFloat(pdqMatch[1].replace(/,/g, ''));
      
      const webCardMatch = receiptsText.match(/WebCard\n([\d,.]+)/i);
      if (webCardMatch) result.receipts.webCard = parseFloat(webCardMatch[1].replace(/,/g, ''));
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('POS parse error:', error);
    return NextResponse.json({ error: 'Failed to parse POS report' }, { status: 500 });
  }
}
