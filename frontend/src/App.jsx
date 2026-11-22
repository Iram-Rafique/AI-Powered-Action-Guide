import { Routes, Route, Navigate } from 'react-router-dom'

import Register from './pages/Register'
import Login from './pages/Login'
import MyDocuments from './pages/MyDocuments'
import UploadDocument from './pages/UploadDocument'
import DocumentResult from './pages/DocumentResult'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/my-documents" element={<MyDocuments />} />
      <Route path="/upload" element={<UploadDocument />} />
      <Route path="/documents/:id" element={<DocumentResult />} />
    </Routes>
  )
}

export default App
