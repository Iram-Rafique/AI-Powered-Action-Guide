import { Routes, Route } from 'react-router-dom'

import Register from './pages/Register'
import Login from './pages/Login'
import MyDocuments from './pages/MyDocuments'
import UploadDocument from './pages/UploadDocument'
import DocumentResult from './pages/DocumentResult'
import { ProtectedRoute, GuestRoute, HomeRedirect } from './components/RouteGuards'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      {/* Visitors who are not logged in */}
      <Route element={<GuestRoute />}>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Logged-in users only */}
      <Route element={<ProtectedRoute />}>
        <Route path="/my-documents" element={<MyDocuments />} />
        <Route path="/upload" element={<UploadDocument />} />
        <Route path="/documents/:id" element={<DocumentResult />} />
      </Route>

      {/* Any unknown address */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export default App