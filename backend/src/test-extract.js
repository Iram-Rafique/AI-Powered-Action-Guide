import 'dotenv/config'
import fs from 'node:fs'
import { extractWithGemini } from './services/geminiService.js'

const text = fs.readFileSync('test-documents/council_letter.txt', 'utf8')
console.log('Model:', process.env.GEMINI_MODEL, '| Backup:', process.env.GEMINI_BACKUP_MODEL)

try {
  const result = await extractWithGemini({ text })
  console.log('Letter date:', result.letterDate)
  console.table(result.items.map((i) => ({
    type: i.item_type,
    description: i.description,
    due_date: i.due_date ? i.due_date.toISOString().slice(0, 10) : '',
  })))
} catch (error) {
  console.log('FINAL ERROR:', error.message)
}