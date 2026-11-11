
import bcrypt from 'bcrypt'
import prisma from '../config.js'

export const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body

    // Validate required fields
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: 'Please provide your name, email and password.',
      })
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({
        message: 'Please provide a valid email address.',
      })
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check for an existing account
    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.users.create({
      data: {
        name: fullName.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        created_at: true,
      },
    })

    return res.status(201).json({
      message: 'Account created successfully.',
      user,
    })
  } catch (error) {
    console.error('Registration error:', error)

    return res.status(500).json({
      message: 'Unable to create your account. Please try again.',
    })
  }
}
