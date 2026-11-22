
import jwt from 'jsonwebtoken'

// Checks the JWT sent by the frontend and adds the user's ID to the request.
// Any route that uses this middleware can only be accessed by logged-in users.
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Please log in to continue.',
    })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    return next()
  } catch {
    // Token is invalid or has expired
    return res.status(401).json({
      message: 'Your session has expired. Please log in again.',
    })
  }
}
