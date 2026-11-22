
import multer from 'multer'

// Supported file types (must match the frontend validation)
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png']
export const MAX_FILE_SIZE_MB = 5

// Files are kept in memory only and are never saved to disk.
// Only the extracted information is stored in the database.
export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      const error = new Error('Please upload a PDF, TXT, JPG or PNG file.')
      error.status = 400
      return cb(error)
    }
    return cb(null, true)
  },
}).single('document')
