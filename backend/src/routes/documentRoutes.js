import express from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { uploadDocument } from '../middleware/uploadMiddleware.js'
import {
  uploadAndProcess,
  listDocuments,
  getDocument,
  updateActionStatus,
  deleteDocument,
  editItem,
  deleteItem,
  emailDocument,
} from '../controllers/documentController.js'

const router = express.Router()

// Every document route requires a logged-in user
router.use(requireAuth)

router.post('/upload', uploadDocument, uploadAndProcess)
router.get('/', listDocuments)
router.patch('/items/:itemId', updateActionStatus)
router.put('/items/:itemId', editItem)
router.delete('/items/:itemId', deleteItem)
router.get('/:id', getDocument)
router.delete('/:id', deleteDocument)
router.post('/:id/email', emailDocument)

export default router