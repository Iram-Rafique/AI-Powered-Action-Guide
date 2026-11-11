
import 'dotenv/config'
import prisma from './config.js'

async function testConnection() {
  try {
    await prisma.$connect()
    console.log('PostgreSQL connected successfully!')
  } catch (error) {
    console.error('Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
