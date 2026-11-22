import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'

console.log('Key found:', Boolean(process.env.GEMINI_API_KEY))
console.log('Model:', process.env.GEMINI_MODEL || 'gemini-3.5-flash')

try {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    contents: 'Reply with the word OK',
  })
  console.log('Gemini replied:', response.text)
} catch (error) {
  console.log('Gemini error:', error.message)
}