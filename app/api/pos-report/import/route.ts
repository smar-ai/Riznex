import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const clientId = session.user.role === 'admin' ? body.clientId : session.user.clientId;
    if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 });

    const is2025 = body.is2025 === true;
    const { dateTill, expenses, receipts, salesGross, salesNet, salesVat, ordersTotal } = body.data;
    
    // Parse the date
    let parsedDate = new Date();
    if (dateTill) {
      const [day, month, year] = dateTill.split('/');
      if (day && month && year) {
        parsedDate = new Date(`${year}-${month}-${day}T12:00:00Z`);
      }
    }

    // 1. Supplier Invoice for One Stop
    if (expenses.oneStop > 0) {
      // Find or create "One Stop" supplier
      let supplier = await prisma.supplier.findFirst({
        where: { clientId, name: { equals: 'One Stop' } }
      });
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: { clientId, name: 'One Stop', category: 'other', franchise: 'Herbies Pizza' }
        });
      }

      await prisma.invoice.create({
        data: {
          clientId,
          is2025,
          supplierId: supplier.id,
          type: 'supplier',
          fileName: 'POS_Import_OneStop',
          filePath: '#',
          fileType: 'text',
          amount: expenses.oneStop,
          invoiceDate: parsedDate,
          ocrStatus: 'done',
          notes: 'Auto-imported from Herbies POS Report'
        }
      });
    }

    // 2. Expenses (Petrol and Other)
    if (expenses.petrol > 0) {
      if (is2025) {
        // Herbies Petrol 100%
        await prisma.expense.create({
          data: {
            clientId,
            is2025,
            category: 'fuel',
            subcategory: 'Herbies Pizza',
            amount: expenses.petrol,
            period: 'weekly',
            date: parsedDate,
            notes: 'Auto-imported petrol from POS'
          }
        });
      } else {
        const halfPetrol = expenses.petrol / 2;
        // Herbies Petrol
        await prisma.expense.create({
          data: {
            clientId,
            category: 'fuel',
            subcategory: 'Herbies Pizza',
            amount: halfPetrol,
            period: 'weekly',
            date: parsedDate,
            notes: 'Auto-imported split petrol from POS'
          }
        });
        // Tasty Bun Petrol
        await prisma.expense.create({
          data: {
            clientId,
            category: 'fuel',
            subcategory: 'Tasty Bun',
            amount: halfPetrol,
            period: 'weekly',
            date: parsedDate,
            notes: 'Auto-imported split petrol from POS'
          }
        });
      }
    }

    if (expenses.other > 0) {
      await prisma.expense.create({
        data: {
          clientId,
          is2025,
          category: 'misc',
          subcategory: 'Herbies Pizza',
          amount: expenses.other,
          period: 'weekly',
          date: parsedDate,
          notes: 'Auto-imported "Expense" from POS'
        }
      });
    }

    // 3. Staff Wages
    if (expenses.wages > 0) {
      // Find or create staff "Jassi"
      let staff = await prisma.staff.findFirst({
        where: { clientId, name: { equals: 'Jassi' } }
      });
      if (!staff) {
        staff = await prisma.staff.create({
          data: { clientId, name: 'Jassi' }
        });
      }

      await prisma.staffWage.create({
        data: {
          clientId,
          is2025,
          staffId: staff.id,
          weekEnd: parsedDate,
          amount: expenses.wages,
          store: 'Herbies Pizza'
        }
      });
    }

    // 4. Sales
    const weekStart = new Date(parsedDate);
    weekStart.setDate(weekStart.getDate() - 6); // Approximation for weekStart

    if (receipts.webCard > 0) {
      const gross = receipts.webCard;
      const commission = gross * 0.085;
      const vat = commission * 0.20;
      const netPaid = gross - commission - vat;

      await prisma.sale.create({
        data: {
          clientId,
          is2025,
          store: 'Herbies Pizza',
          platform: 'Website',
          weekStart,
          weekEnd: parsedDate,
          grossSales: gross,
          commission: commission,
          vat: vat,
          netPaid: netPaid,
          notes: 'Auto-imported WebCard from POS (8.5% Comm)'
        }
      });
    }

    const posTotal = receipts.cash + receipts.pdq;
    if (posTotal > 0) {
      await prisma.sale.create({
        data: {
          clientId,
          is2025,
          store: 'Herbies Pizza',
          platform: 'POS',
          weekStart,
          weekEnd: parsedDate,
          grossSales: posTotal,
          cashOrders: receipts.cash,
          netPaid: posTotal,
          totalOrders: ordersTotal, // Assign total orders to POS to avoid double counting
          vat: salesVat,
          notes: 'Auto-imported Cash & PDQ from POS'
        }
      });
    }

    return NextResponse.json({ success: true, message: 'All records imported successfully' });

  } catch (error) {
    console.error('POS import error:', error);
    return NextResponse.json({ error: 'Failed to import records' }, { status: 500 });
  }
}
