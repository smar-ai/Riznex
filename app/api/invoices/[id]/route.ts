import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { getWeekStart, getWeekEnd } from '@/lib/utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  
  const body = await req.json()
  
  const oldInvoice = await prisma.invoice.findUnique({
    where: { id }
  })
  if (!oldInvoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  
  const updateData: any = {}
  if (body.invoiceDate !== undefined) {
    updateData.invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : null
  }
  if (body.amount !== undefined) {
    updateData.amount = parseFloat(body.amount)
  }
  if (body.ocrStatus !== undefined) {
    updateData.ocrStatus = body.ocrStatus
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes
  }

  if (Object.keys(updateData).length > 0) {
    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData
    })
    
    // Auto-update linked records if date changed
    if (updateData.invoiceDate !== undefined && updateData.invoiceDate !== null) {
      const newWeekStart = getWeekStart(updateData.invoiceDate)
      const newWeekEnd = getWeekEnd(newWeekStart)
      
      await prisma.sale.updateMany({ 
        where: { invoiceId: id }, 
        data: { weekStart: newWeekStart, weekEnd: newWeekEnd } 
      }).catch(()=>{})
      
      await prisma.expense.updateMany({ 
        where: { invoiceId: id }, 
        data: { date: updateData.invoiceDate } 
      }).catch(()=>{})
      
      await prisma.staffWage.updateMany({ 
        where: { invoiceId: id }, 
        data: { weekEnd: newWeekEnd } 
      }).catch(()=>{})
    }

    // Auto-update linked records if amount changed
    if (updateData.amount !== undefined && oldInvoice.amount !== updateData.amount) {
      const oldAmount = oldInvoice.amount || 0
      const newAmount = updateData.amount
      
      if (oldAmount > 0) {
        const scale = newAmount / oldAmount
        
        // 1. Scale linked Sales
        const sales = await prisma.sale.findMany({ where: { invoiceId: id } })
        for (const sale of sales) {
          const newGross = parseFloat((sale.grossSales * scale).toFixed(2))
          const newCommission = parseFloat((sale.commission * scale).toFixed(2))
          const newVat = parseFloat((sale.vat * scale).toFixed(2))
          const newOther = parseFloat((sale.otherFees * scale).toFixed(2))
          const newNetPaid = parseFloat((newGross - newCommission - newVat - newOther).toFixed(2))
          
          await prisma.sale.update({
            where: { id: sale.id },
            data: {
              grossSales: newGross,
              commission: newCommission,
              vat: newVat,
              otherFees: newOther,
              netPaid: newNetPaid
            }
          }).catch(()=>{})
        }

        // 2. Scale linked Expenses
        const expenses = await prisma.expense.findMany({ where: { invoiceId: id } })
        for (const exp of expenses) {
          const newExpAmt = parseFloat((exp.amount * scale).toFixed(2))
          await prisma.expense.update({
            where: { id: exp.id },
            data: { amount: newExpAmt }
          }).catch(()=>{})
        }
      } else {
        // If old amount was 0 or null, split new amount equally among linked records
        const sales = await prisma.sale.findMany({ where: { invoiceId: id } })
        if (sales.length > 0) {
          const splitAmount = parseFloat((newAmount / sales.length).toFixed(2))
          for (const sale of sales) {
            const isTastyBun = sale.platform?.includes('Tasty Bun')
            const isHerbiesWeb = sale.platform === 'Herbies Pizza Website' || sale.platform === 'Herbies Pizza Website & Mobile'
            const commRate = isTastyBun ? 0.04 : (isHerbiesWeb ? 0.085 : 0)
            const commission = parseFloat((splitAmount * commRate).toFixed(2))
            const netPaid = parseFloat((splitAmount - commission).toFixed(2))
            
            await prisma.sale.update({
              where: { id: sale.id },
              data: {
                grossSales: splitAmount,
                commission,
                netPaid
              }
            }).catch(()=>{})
          }
        }
        
        const expenses = await prisma.expense.findMany({ where: { invoiceId: id } })
        if (expenses.length > 0) {
          const splitAmount = parseFloat((newAmount / expenses.length).toFixed(2))
          for (const exp of expenses) {
            await prisma.expense.update({
              where: { id: exp.id },
              data: { amount: splitAmount }
            }).catch(()=>{})
          }
        }
      }
    }

    return NextResponse.json(updated)
  }
  return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  

  const invoice = await prisma.invoice.findUnique({
    where: { id },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Ensure client ownership or admin role
  if (session.user.role !== 'admin' && invoice.clientId !== session.user.clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. Delete associated Sale and Expense records so that totals update immediately
    await prisma.sale.deleteMany({
      where: {
        OR: [
          { invoiceId: id },
          (invoice.platform && invoice.invoiceDate ? {
            clientId: invoice.clientId,
            platform: invoice.platform === 'Walk-in Card' ? 'Walk In Card' : invoice.platform,
            weekEnd: invoice.invoiceDate
          } : {})
        ]
      },
    })

    await prisma.expense.deleteMany({
      where: { invoiceId: id },
    })

    // 2. Delete the physical file from Supabase (if it exists)
    if (invoice.filePath && invoice.filePath.includes('/invoices/')) {
      const bucketPath = invoice.filePath.split('/invoices/')[1]
      if (bucketPath) {
        try {
          await supabase.storage.from('invoices').remove([bucketPath])
        } catch (err) {
          console.warn(`Could not delete file from Supabase:`, err)
        }
      }
    }

    // 3. Delete the Invoice record from the database
    await prisma.invoice.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Invoice and associated data deleted' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
