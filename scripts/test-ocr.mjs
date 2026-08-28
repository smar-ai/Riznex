// Test the OCR worker directly on one of the failed images
import { execSync } from 'child_process'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()
const inv = await p.invoice.findFirst({ 
  where: { ocrStatus: 'error', platform: { contains: 'Uber Eats' } }
})
await p.$disconnect()

if (!inv) { console.log('No failed invoices'); process.exit(0) }

console.log('Testing OCR on:', inv.fileName)
const filePath = path.join(process.cwd(), 'public', inv.filePath)
console.log('File path:', filePath)

try {
  const result = execSync(`node scripts/ocr-worker.js "${filePath}"`, { timeout: 30000 }).toString()
  const parsed = JSON.parse(result.trim())
  console.log('OCR Success:', parsed.success)
  console.log('Extracted text (first 500 chars):')
  console.log(parsed.text?.substring(0, 500))
} catch(e) {
  console.log('OCR Error:', e.message)
  console.log('stdout:', e.stdout?.toString())
  console.log('stderr:', e.stderr?.toString())
}
