"use client"

let mammothLib: any = null

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

  if (fileName.endsWith(".docx")) {
    return await extractDocxText(file)
  }

  if (fileName.endsWith(".pdf")) {
    return await extractPdfText(file)
  }

  throw new Error("Supported formats: TXT, DOCX, PDF")
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/extract-pdf", {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "PDF extraction failed")
    }

    const data = await res.json()
    return data.text
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
