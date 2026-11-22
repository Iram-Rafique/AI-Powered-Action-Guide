
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import authRoutes from './routes/authRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import { MAX_FILE_SIZE_MB } from './middleware/uploadMiddleware.js'

const app = express()
const PORT = process.env.PORT || 5000

// Allow requests from the React frontend
app.use(cors({
  origin: 'http://localhost:5173',
}))

// Read JSON request bodies
app.use(express.json())

// API health check
app.get('/', (req, res) => {
  res.json({ message: 'Action Guide API is running.' })
})

// Authentication routes
app.use('/api/auth', authRoutes)

// Document routes (login required)
app.use('/api/documents', documentRoutes)

// Error handler: returns clear JSON messages instead of crashing
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: `The file must be smaller than ${MAX_FILE_SIZE_MB} MB.` })
  }

  if (err.status === 400) {
    return res.status(400).json({ message: err.message })
  }

  console.error('Unexpected error:', err)
  return res.status(500).json({ message: 'Something went wrong. Please try again.' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Action Guide API running on http://localhost:${PORT}`)
})
