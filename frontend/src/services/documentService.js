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

// Edit an item's text and due date (dueDate is "YYYY-MM-DD" or "" for no date)
export const editItem = async (itemId, description, dueDate) => {
  const response = await fetch(`${API_URL}/api/documents/items/${itemId}`, {
    method: 'PUT',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, due_date: dueDate || null }),
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