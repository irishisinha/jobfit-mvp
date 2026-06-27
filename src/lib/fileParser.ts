"use client"

let pdfjsLib: any = null
let mammothLib: any = null

async function getPdfjsLib() {
  if (pdfjsLib) return pdfjsLib
  if (typeof window === "undefined") return null
  
  pdfjsLib = await import("pdfjs-dist")
  // Set worker AFTER import, only on client
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  return pdfjsLib
}

async function getMammothLib() {
  if (mammothLib) return mammothLib
  if (typeof window === "undefined") return null
  
  mammothLib = await import("mammoth")
  return mammothLib
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith(".txt")) {
    return await file.text()
  }

  if (fileName.endsWith(".pdf")) {
    return await extractPdfText(file)
  }

  if (fileName.endsWith(".docx")) {
    return await extractDocxText(file)
  }

  throw new Error(`Unsupported format: use TXT, PDF, or DOCX`)
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await getPdfjsLib()
    if (!pdfjsLib) throw new Error("PDF.js not available")
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ""

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(" ")
      text += pageText + "\n"
    }

    return text.trim()
  } catch (error) {
    throw new Error(`Failed to extract PDF: ${error}`)
  }
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await getMammothLib()
    if (!mammoth) throw new Error("DOCX parser not available")
    
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (error) {
    throw new Error(`Failed to extract DOCX: ${error}`)
  }
}
