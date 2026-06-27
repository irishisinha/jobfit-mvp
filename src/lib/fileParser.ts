"use client"

let mammothLib: any = null

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
    throw new Error("PDF support coming soon. Please use TXT or DOCX format for now.")
  }

  if (fileName.endsWith(".docx")) {
    return await extractDocxText(file)
  }

  throw new Error(`Unsupported file format. Use TXT or DOCX.`)
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await getMammothLib()
    if (!mammoth) throw new Error("DOCX parser not available")

    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (error) {
    throw new Error(`Failed to extract DOCX text: ${error}`)
  }
}
