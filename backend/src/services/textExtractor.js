
import { PDFParse } from 'pdf-parse'

// Minimum amount of text needed to treat a document as readable
const MIN_TEXT_LENGTH = 20

// Returns the text of a PDF or TXT file.
// Images (JPG/PNG) are not converted here: they are sent directly to Gemini,
// which can read text from images.
export const extractText = async (file) => {
  if (file.mimetype === 'text/plain') {
    return file.buffer.toString('utf8').trim()
  }

  if (file.mimetype === 'application/pdf') {
    const parser = new PDFParse({ data: new Uint8Array(file.buffer) })
    try {
      const result = await parser.getText()
      return result.text.trim()
    } finally {
      await parser.destroy()
    }
  }

  return null
}

export const isImage = (file) =>
  file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'

export const hasEnoughText = (text) =>
  typeof text === 'string' && text.length >= MIN_TEXT_LENGTH
