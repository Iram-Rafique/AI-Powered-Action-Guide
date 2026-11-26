// Document requests

const API_URL = import.meta.env.VITE_API_URL

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

// Reads the JSON response and throws an error with the server's message if needed
const handleResponse = async (response, fallbackMessage) => {
  // The server may not return JSON if something goes badly wrong
  let data
  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    const error = new Error(data.message || fallbackMessage)
    error.status = response.status
    throw error
  }

  return data
}

export const uploadDocument = async (file) => {
  // FormData is needed to send a file. Do not set Content-Type here:
  // the browser adds it automatically with the correct boundary.
  const formData = new FormData()
  formData.append('document', file)

  const response = await fetch(`${API_URL}/api/documents/upload`, {
    method: 'POST',
    headers: authHeader(),
    body: formData,
  })

  return handleResponse(response, 'Upload failed. Please try again.')
}

export const getDocuments = async () => {
  const response = await fetch(`${API_URL}/api/documents`, {
    headers: authHeader(),
  })

  return handleResponse(response, 'Unable to load your documents.')
}

export const getDocument = async (documentId) => {
  const response = await fetch(`${API_URL}/api/documents/${documentId}`, {
    headers: authHeader(),
  })

  return handleResponse(response, 'Unable to load this document.')
}

export const updateActionStatus = async (itemId, actionStatus) => {
  const response = await fetch(`${API_URL}/api/documents/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action_status: actionStatus }),
  })

  return handleResponse(response, 'Unable to update this action.')
}

export const deleteDocument = async (documentId) => {
  const response = await fetch(`${API_URL}/api/documents/${documentId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })

  return handleResponse(response, 'Unable to delete this document.')
}

// Edit an item. fields: { description, due_date ("YYYY-MM-DD" or ""), item_type, action_status }
export const editItem = async (itemId, fields) => {
  const response = await fetch(`${API_URL}/api/documents/items/${itemId}`, {
    method: 'PUT',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...fields, due_date: fields.due_date || null }),
  })

  return handleResponse(response, 'Unable to save your changes.')
}

export const deleteItem = async (itemId) => {
  const response = await fetch(`${API_URL}/api/documents/items/${itemId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })

  return handleResponse(response, 'Unable to remove this item.')
}

// Emails the Action Guide to the logged-in user's own address
export const emailDocument = async (documentId) => {
  const response = await fetch(`${API_URL}/api/documents/${documentId}/email`, {
    method: 'POST',
    headers: authHeader(),
  })

  return handleResponse(response, 'We could not send the email. Please try again later.')
}

// Asks a question about one document. messages: [{ role: 'user' | 'assistant', text }]
export const askDocument = async (documentId, messages) => {
  const response = await fetch(`${API_URL}/api/documents/${documentId}/chat`, {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  return handleResponse(response, 'The assistant is busy right now. Please try again in a moment.')
}