
import bcrypt from 'bcrypt'
import prisma from '../config.js'
import jwt from 'jsonwebtoken'

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

// for login 

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: 'Please provide your email and password.',
      })
    }

    // Find user by email
    const user = await prisma.users.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    })

    // Check whether the user exists
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      })
    }

    // Compare submitted password with stored password hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      })
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Return token and user details
    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    return res.status(500).json({
      message: 'Unable to log in. Please try again.',
    })
  }
}
