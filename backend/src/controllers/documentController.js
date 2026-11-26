import prisma from '../config.js'
import { extractText, isImage, hasEnoughText } from '../services/textExtractor.js'
import { extractWithGemini } from '../services/geminiService.js'
import { parseIsoDate } from '../services/extractionValidator.js'
import { buildActionGuideEmail, emailConfigured, sendEmail } from '../services/emailService.js'

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
// Returns the user's documents with a progress summary for each one, so the
// My Documents page can show progress, the next deadline and the summary strip.
export const listDocuments = async (req, res) => {
  const documents = await prisma.documents.findMany({
    where: { user_id: req.userId },
    orderBy: { upload_date: 'desc' },
    include: {
      extracted_items: {
        select: { item_type: true, action_status: true, due_date: true },
      },
    },
  })

  const summaries = documents.map(({ extracted_items: items, ...document }) => {
    const actions = items.filter((item) => item.item_type === 'action')
    const pending = actions.filter((item) => item.action_status !== 'completed')

    return {
      ...document,
      item_count: items.length,
      action_count: actions.length,
      done_count: actions.length - pending.length,
      // Due dates of actions that are not completed yet, earliest first
      pending_due_dates: pending
        .map((item) => item.due_date)
        .filter(Boolean)
        .sort((a, b) => a - b),
    }
  })

  return res.json({ documents: summaries })
}

// DELETE /api/documents/:id
// Deletes a document and its extracted items (FR8).
export const deleteDocument = async (req, res) => {
  const documentId = Number(req.params.id)

  if (!Number.isInteger(documentId)) {
    return res.status(400).json({ message: 'Invalid document ID.' })
  }

  // Only delete the document if it belongs to the logged-in user
  const document = await prisma.documents.findFirst({
    where: { document_id: documentId, user_id: req.userId },
    select: { document_id: true },
  })

  if (!document) {
    return res.status(404).json({ message: 'Document not found.' })
  }

  // The items must be removed before the document (foreign key),
  // and the transaction makes sure both are deleted or neither is.
  await prisma.$transaction([
    prisma.extracted_items.deleteMany({ where: { document_id: documentId } }),
    prisma.documents.delete({ where: { document_id: documentId } }),
  ])

  return res.json({ message: 'Document deleted.' })
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

// Finds an extracted item only if its document belongs to the logged-in user
const findOwnItem = (itemId, userId) =>
  prisma.extracted_items.findFirst({
    where: { item_id: itemId, documents: { user_id: userId } },
  })

// PUT /api/documents/items/:itemId  (edit an item, FR7)
// Body: { description, due_date, item_type, action_status }
// item_type and action_status are optional; if left out, they stay as they are.
const ITEM_TYPES = ['action', 'date', 'detail']
const ACTION_STATUSES = ['pending', 'in progress', 'completed']

export const editItem = async (req, res) => {
  const itemId = Number(req.params.itemId)
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : ''
  const rawDate = req.body.due_date

  if (!Number.isInteger(itemId)) {
    return res.status(400).json({ message: 'Invalid item.' })
  }
  if (!description) {
    return res.status(400).json({ message: 'Please enter a description.' })
  }
  if (description.length > 500) {
    return res.status(400).json({ message: 'The description must be 500 characters or fewer.' })
  }

  const item = await findOwnItem(itemId, req.userId)
  if (!item) {
    return res.status(404).json({ message: 'Item not found.' })
  }

  const itemType = req.body.item_type ?? item.item_type
  if (!ITEM_TYPES.includes(itemType)) {
    return res.status(400).json({ message: 'Invalid section.' })
  }

  // Only actions have a status; a new action starts as pending
  let actionStatus = null
  if (itemType === 'action') {
    actionStatus = req.body.action_status ?? item.action_status ?? 'pending'
    if (!ACTION_STATUSES.includes(actionStatus)) {
      return res.status(400).json({ message: 'Invalid status.' })
    }
  }

  // Details have no date. Otherwise the date is optional: empty means "no date",
  // and anything else must be a real YYYY-MM-DD date.
  let dueDate = null
  if (itemType !== 'detail' && rawDate) {
    dueDate = parseIsoDate(rawDate)
    if (!dueDate) {
      return res.status(400).json({ message: 'Please enter a valid date.' })
    }
  }

  const updated = await prisma.extracted_items.update({
    where: { item_id: itemId },
    data: { description, due_date: dueDate, item_type: itemType, action_status: actionStatus },
  })

  return res.json({ item: updated })
}

// DELETE /api/documents/items/:itemId  (remove an item the AI got wrong)
export const deleteItem = async (req, res) => {
  const itemId = Number(req.params.itemId)

  if (!Number.isInteger(itemId)) {
    return res.status(400).json({ message: 'Invalid item.' })
  }

  const item = await findOwnItem(itemId, req.userId)
  if (!item) {
    return res.status(404).json({ message: 'Item not found.' })
  }

  await prisma.extracted_items.delete({ where: { item_id: itemId } })
  return res.json({ message: 'Item removed.' })
}

// POST /api/documents/:id/email
// Emails the Action Guide to the logged-in user's own address.
// One email per document per minute, so the button cannot be used to flood an inbox.
const EMAIL_COOLDOWN_MS = 60 * 1000
const lastEmailSent = new Map()

export const emailDocument = async (req, res) => {
  const documentId = Number(req.params.id)

  if (!Number.isInteger(documentId)) {
    return res.status(400).json({ message: 'Invalid document ID.' })
  }
  if (!emailConfigured()) {
    return res.status(503).json({ message: 'Email is not set up on the server yet.' })
  }

  const document = await prisma.documents.findFirst({
    where: { document_id: documentId, user_id: req.userId, processing_status: 'processed' },
    include: { extracted_items: true },
  })
  if (!document) {
    return res.status(404).json({ message: 'Document not found.' })
  }

  const key = `${req.userId}:${documentId}`
  const waitMs = (lastEmailSent.get(key) || 0) + EMAIL_COOLDOWN_MS - Date.now()
  if (waitMs > 0) {
    return res.status(429).json({ message: `Please wait ${Math.ceil(waitMs / 1000)} seconds before sending this again.` })
  }

  const user = await prisma.users.findUnique({
    where: { user_id: req.userId },
    select: { name: true, email: true },
  })

  try {
    const email = buildActionGuideEmail(document, user.name.split(' ')[0])
    await sendEmail({ to: user.email, ...email })
    lastEmailSent.set(key, Date.now())
    return res.json({ message: `Sent to ${user.email}` })
  } catch (error) {
    console.error('Email failed:', error.message)
    return res.status(502).json({ message: 'We could not send the email. Please try again later.' })
  }
}