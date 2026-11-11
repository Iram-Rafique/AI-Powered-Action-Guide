
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'

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

// Start server
app.listen(PORT, () => {
  console.log(`Action Guide API running on http://localhost:${PORT}`)
})
