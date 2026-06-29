'use client'

// Polyfill DOMMatrix if not available (required by PDF.js in some environments)
if (typeof globalThis !== 'undefined' && !globalThis.DOMMatrix) {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    constructor(init?: string | number[]) {}
    multiply() { return this }
    inverse() { return this }
    transformPoint() { return { x: 0, y: 0 } }
  }
}

import * as pdfjsLib from 'pdfjs-dist'
import * as mammoth from 'mammoth'

// Set up PDF.js worker IMMEDIATELY after import
// Served from /public (copied from node_modules via postinstall script)
// Uses .mjs worker since modern pdfjs-dist versions ship that format
if (typeof window !== 'undefined' && typeof pdfjsLib !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  } catch (e) {
    console.warn('Failed to set PDF.js worker source:', e)
  }
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
  try {
    console.log('Starting PDF extraction for:', file.name)
    const arrayBuffer = await file.arrayBuffer()
    console.log('File read, size:', arrayBuffer.byteLength)

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    console.log('PDF loaded, pages:', pdf.numPages)

    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      text += pageText + '\n'
    }

    console.log('PDF extraction complete, text length:', text.length)
    return text
  } catch (error) {
    console.error('PDF extraction failed:', error)
    throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
