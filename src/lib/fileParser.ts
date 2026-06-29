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

// Set up PDF.js worker with mobile fallback
// Critical for both desktop and mobile browsers
if (typeof window !== 'undefined' && typeof pdfjsLib !== 'undefined') {
  const setupWorker = () => {
    try {
      // Primary: Use local worker file (served from /public)
      const workerPath = new URL('/pdf.worker.min.mjs', window.location.origin).href
      console.log('Setting PDF.js worker to:', workerPath)
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath

      // Fallback: Use CDN version if local fails
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc ||
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

      console.log('PDF.js worker configured successfully')
    } catch (e) {
      console.warn('PDF.js worker setup warning:', e)
      // Attempt CDN fallback
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      } catch (fallbackError) {
        console.error('All worker setup attempts failed:', fallbackError)
      }
    }
  }

  // Set up on document load for mobile compatibility
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWorker)
  } else {
    setupWorker()
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  console.log('Extracting from:', fileName, 'Type:', file.type, 'Size:', file.size)

  if (fileName.endsWith('.txt')) {
    try {
      return await file.text()
    } catch (e) {
      console.error('TXT extraction failed:', e)
      throw new Error(`Failed to read TXT file: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  if (fileName.endsWith('.pdf')) {
    return await extractPdfText(file)
  }

  if (fileName.endsWith('.docx')) {
    try {
      return await extractDocxText(file)
    } catch (e) {
      console.error('DOCX extraction failed:', e)
      throw new Error(`Failed to read DOCX file: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  throw new Error(`Unsupported file format: ${file.type || 'unknown'}. Supported: .pdf, .txt, .docx`)
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
