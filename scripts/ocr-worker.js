require('dotenv').config()
const Tesseract = require('tesseract.js')

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.log(JSON.stringify({ success: false, error: 'No file path provided' }))
    process.exit(1)
  }
  
  try {
    const result = await Tesseract.recognize(filePath, 'eng')
    console.log(JSON.stringify({ success: true, text: result.data.text }))
    process.exit(0)
  } catch (err) {
    console.log(JSON.stringify({ success: false, error: err.message }))
    process.exit(1)
  }
}
main()
