import * as pdfjsLib from 'pdfjs-dist'
import * as mammoth from 'mammoth'

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.txt')) {
    return await file.text()
  }

  if (fileName.endsWith('.pdf')) {
    return await extractPdfText(file)
  }

  if (fileName.endsWith('.docx')) {
    return await extractDocxText(file)
  }

  throw new Error(`Unsupported file format: ${file.type}`)
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item: any) => item.str).join(' ')
    text += pageText + '\n'
  }

  return text
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
