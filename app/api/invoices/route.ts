import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = session.user.role === 'admin' ? searchParams.get('clientId') : session.user.clientId
  const type = searchParams.get('type')
  const platform = searchParams.get('platform')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const is2025 = searchParams.get('is2025') === 'true'
  if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

  const where: any = { clientId, is2025 }
  if (type) where.type = type
  if (platform) {
    if (platform.includes('Website')) {
      where.platform = { contains: platform.replace('Website', 'POS') }
    } else {
      where.platform = { contains: platform }
    }
  }
  const defaultFrom = is2025 ? new Date(2000, 0, 1) : new Date(Date.UTC(2026, 3, 1))
  const dateFrom = from ? new Date(from) : defaultFrom
  // Look back 7 days for platform statements whose week start is late previous month but week end is in target month
  const queryFrom = from ? new Date(dateFrom.getTime() - 7 * 24 * 60 * 60 * 1000) : defaultFrom

  where.OR = [
    { invoiceDate: { gte: queryFrom, ...(to ? { lte: (() => { const t = new Date(to); t.setUTCHours(23, 59, 59, 999); return t })() } : {}) } },
    { invoiceDate: null }
  ]

  const invoices = await prisma.invoice.findMany({
    where,
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(invoices)
}

import { PDFDocument } from 'pdf-lib'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const files = formData.getAll('file') as File[]
  const clientId = session.user.role === 'admin'
    ? (formData.get('clientId') as string)
    : session.user.clientId!
  const type = formData.get('type') as string || 'supplier'
  const supplierId = formData.get('supplierId') as string | null
  const platform = formData.get('platform') as string | null
  const invoiceDate = formData.get('invoiceDate') as string | null
  const amount = formData.get('amount') as string | null
  const is2025 = formData.get('is2025') === 'true'

  if (!files || files.length === 0) return NextResponse.json({ error: 'File required' }, { status: 400 })

  let finalBuffer: Buffer
  let finalFileName: string
  let finalFileType: string

  if (files.length === 1) {
    const file = files[0]
    finalBuffer = Buffer.from(await file.arrayBuffer())
    finalFileName = file.name
    finalFileType = file.type.includes('pdf') ? 'pdf' : 'image'
  } else {
    // Merge multiple images/pdfs into a single PDF
    const pdfDoc = await PDFDocument.create()
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      if (file.type.includes('pdf')) {
        const doc = await PDFDocument.load(buffer)
        const copiedPages = await pdfDoc.copyPages(doc, doc.getPageIndices())
        copiedPages.forEach(page => pdfDoc.addPage(page))
      } else if (file.type.includes('jpeg') || file.type.includes('jpg')) {
        const image = await pdfDoc.embedJpg(buffer)
        const page = pdfDoc.addPage([image.width, image.height])
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
      } else if (file.type.includes('png')) {
        const image = await pdfDoc.embedPng(buffer)
        const page = pdfDoc.addPage([image.width, image.height])
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
      }
    }
    finalBuffer = Buffer.from(await pdfDoc.save())
    finalFileName = `merged_invoice_${Date.now()}.pdf`
    finalFileType = 'pdf'
  }

  const hash = crypto.createHash('sha256').update(finalBuffer).digest('hex')

  const existingExact = await prisma.invoice.findFirst({
    where: { clientId, fileHash: hash }
  })

  if (existingExact) {
    return NextResponse.json({ error: 'Duplicate file detected' }, { status: 409 })
  }

  const fileName = `${Date.now()}-${finalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(`${clientId}/${fileName}`, finalBuffer, {
      contentType: finalFileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Failed to upload to cloud storage' }, { status: 500 })
  }

  const { data: publicUrlData } = supabase.storage.from('invoices').getPublicUrl(`${clientId}/${fileName}`)
  const publicPath = publicUrlData.publicUrl

  const invoice = await prisma.invoice.create({
    data: {
      clientId,
      supplierId: supplierId || null,
      type,
      platform: platform || null,
      fileName: finalFileName,
      filePath: publicPath,
      fileType: finalFileType,
      fileHash: hash,
      amount: amount ? parseFloat(amount) : null,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
      ocrStatus: 'pending',
      is2025,
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clientId = session.user.role === 'admin' ? null : session.user.clientId

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.ids)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const invoices = await prisma.invoice.findMany({
    where: { 
      id: { in: body.ids }, 
      ...(clientId ? { clientId } : {})
    }
  })

  const validIds = invoices.map(i => i.id)
  
  if (validIds.length > 0) {
    await prisma.sale.deleteMany({ where: { invoiceId: { in: validIds } } })
    await prisma.expense.deleteMany({ where: { invoiceId: { in: validIds } } })
    await prisma.staffWage.deleteMany({ where: { invoiceId: { in: validIds } } })
    await prisma.invoice.deleteMany({ where: { sourceInvoiceId: { in: validIds } } })

    for (const inv of invoices) {
      if (inv.filePath && inv.filePath.includes('/invoices/')) {
        const bucketPath = inv.filePath.split('/invoices/')[1]
        if (bucketPath) {
          try { await supabase.storage.from('invoices').remove([bucketPath]) } catch (e) {}
        }
      }
    }

    await prisma.invoice.deleteMany({ where: { id: { in: validIds } } })
  }

  return NextResponse.json({ success: true, count: validIds.length })
}
