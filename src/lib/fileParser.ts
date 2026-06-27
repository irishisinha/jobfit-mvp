"use client"

let pdfjsLib: any = null
let mammothLib: any = null

// Dynamically import pdfjs only on client
async function getPdfjsLib() {
  if (pdfjsLib) return pdfjsLib
  
  if (typeof window !== "undefined") {
    pdfjsLib = await import("pdfjs-dist")
    // Use jsdelivr CDN instead of cdnjs - more reliable
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
  }
  return pdfjsLib
}

// Dynamically import mammoth only on client
async function getMammothLib() {
  if (mammothLib) return mammothLib
  
  if (typeof window !== "undefined") {
    mammothLib = await import("mammoth")
  }
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

  throw new Error(`Unsupported file format: ${file.type}`)
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await getPdfjsLib()
    if (!pdfjsLib) throw new Error("PDF.js not available")

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
    let text = ""

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map((item: any) => item.str).join(" ") + "\n"
    }

    return text
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error}`)
  }
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await getMammothLib()
    if (!mammoth) throw new Error("Mammoth not available")

    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (error) {
    throw new Error(`Failed to extract DOCX text: ${error}`)
  }
}
