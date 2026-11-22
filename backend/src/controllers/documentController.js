
import prisma from '../config.js'
import { extractText, isImage, hasEnoughText } from '../services/textExtractor.js'
import { extractWithGemini } from '../services/geminiService.js'

const VALID_ACTION_STATUSES = ['pending', 'in progress', 'completed']

const markFailed = (documentId) =>
  prisma.documents.update({
    where: { document_id: documentId },
    data: { processing_status: 'failed' },
  })

// POST /api/documents/upload
export const uploadAndProcess = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please choose a document to upload.' })
  }

  // 1. Create the document record
  const document = await prisma.documents.create({
    data: {
      user_id: req.userId,
      document_name: req.file.originalname.slice(0, 255),
      processing_status: 'processing',
    },
  })

  // 2. Extract text (images are sent to Gemini directly)
  let text = null
  if (!isImage(req.file)) {
    try {
      text = await extractText(req.file)
    } catch (error) {
      console.error('Text extraction error:', error.message)
    }

    if (!hasEnoughText(text)) {
      await markFailed(document.document_id)
      return res.status(422).json({
        message:
          'Text could not be read from this document. If it is a scanned PDF, try uploading it as a JPG or PNG image instead.',
      })
    }
  }

  // 3. Send to Gemini and validate the response (retried once if it fails)
  let extraction
  try {
    extraction = await extractWithGemini(
      isImage(req.file) ? { image: req.file } : { text }
    )
  } catch (error) {
    console.error('AI processing error:', error.message)
    await markFailed(document.document_id)
    return res.status(502).json({
      message: 'The document could not be processed. Please try again.',
    })
  }

  // 4. Save the extracted items and mark the document as processed.
  // A transaction makes sure either everything is saved or nothing is.
  try {
    await prisma.$transaction([
      prisma.extracted_items.createMany({
        data: extraction.items.map((item) => ({
          ...item,
          document_id: document.document_id,
        })),
      }),
      prisma.documents.update({
        where: { document_id: document.document_id },
        data: { processing_status: 'processed' },
      }),
    ])
  } catch (error) {
    console.error('Database error:', error.message)
    await markFailed(document.document_id)
    return res.status(500).json({
      message: 'The results could not be saved. Please try again.',
    })
  }

  return res.status(201).json({
    message: 'Document processed successfully.',
    document_id: document.document_id,
  })
}

// GET /api/documents
export const listDocuments = async (req, res) => {
  const documents = await prisma.documents.findMany({
    where: { user_id: req.userId },
    orderBy: { upload_date: 'desc' },
    include: { _count: { select: { extracted_items: true } } },
  })

  return res.json({ documents })
}

// GET /api/documents/:id
export const getDocument = async (req, res) => {
  const documentId = Number(req.params.id)

  if (!Number.isInteger(documentId)) {
    return res.status(400).json({ message: 'Invalid document ID.' })
  }

  // Only return the document if it belongs to the logged-in user
  const document = await prisma.documents.findFirst({
    where: { document_id: documentId, user_id: req.userId },
    include: { extracted_items: { orderBy: { item_id: 'asc' } } },
  })

  if (!document) {
    return res.status(404).json({ message: 'Document not found.' })
  }

  return res.json({ document })
}

// PATCH /api/documents/items/:itemId  (e.g. mark an action as completed)
export const updateActionStatus = async (req, res) => {
  const itemId = Number(req.params.itemId)
  const { action_status: actionStatus } = req.body

  if (!Number.isInteger(itemId) || !VALID_ACTION_STATUSES.includes(actionStatus)) {
    return res.status(400).json({ message: 'Invalid item or status.' })
  }

  // Check the item is an action that belongs to the logged-in user
  const item = await prisma.extracted_items.findFirst({
    where: {
      item_id: itemId,
      item_type: 'action',
      documents: { user_id: req.userId },
    },
  })

  if (!item) {
    return res.status(404).json({ message: 'Action not found.' })
  }

  const updated = await prisma.extracted_items.update({
    where: { item_id: itemId },
    data: { action_status: actionStatus },
  })

  return res.json({ item: updated })
}
