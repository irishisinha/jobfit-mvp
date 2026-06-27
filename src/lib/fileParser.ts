'use client'

// Polyfill DOMMatrix if not available (required by PDF.js in some environments)
if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1
    b = 0
    c = 0
    d = 1
    e = 0
    f = 0
    constructor(init?: string | number[]) {}
    multiply() { return this }
    inverse() { return this }
    transformPoint() { return { x: 0, y: 0 } }
  } as any
}

import * as pdfjsLib from 'pdfjs-dist'
import * as mammoth from 'mammoth'

// Set up PDF.js worker. Served from /public (copied from node_modules via the
// "postinstall:worker" script) since modern pdfjs-dist versions ship a .mjs
// worker that the cdnjs mirror doesn't reliably have for every release.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
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
