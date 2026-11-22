import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FileText, Upload } from 'lucide-react'
import AppLayout from '../layouts/AppLayout'
import { getDocuments } from '../services/documentService'
import { endSession, formatDate } from '../utils/session'

const STATUS_STYLES = {
  processed: 'bg-[#168C83]/10 text-[#116B65]',
  processing: 'bg-amber-50 text-amber-800',
  failed: 'bg-red-50 text-red-700',
}

function MyDocuments() {
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.successMessage

  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true })
      return
    }

    getDocuments()
      .then((data) => setDocuments(data.documents))
      .catch((err) => {
        if (err.status === 401) return endSession(navigate)
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [navigate])

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[#17324D] sm:text-2xl">My Documents</h1>

        <div className="flex gap-3">
          <Link
            to="/upload"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#17324D] px-5 text-sm font-semibold text-white transition hover:bg-[#244766] focus:outline-none focus:ring-2 focus:ring-[#17324D] focus:ring-offset-2"
          >
            <Upload size={17} aria-hidden="true" />
            Upload document
          </Link>
          <button
            type="button"
            onClick={() => endSession(navigate, 'You have been logged out.')}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#D7DEE8] px-4 text-sm font-semibold text-[#17324D] transition hover:border-[#17324D] focus:outline-none focus:ring-2 focus:ring-[#17324D]"
          >
            Log out
          </button>
        </div>
      </div>

      {successMessage && (
        <div role="status" className="mb-5 rounded-lg border border-[#168C83]/30 px-4 py-3 text-sm text-[#116B65]">
          {successMessage}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {isLoading ? (
        <p role="status" className="text-sm text-slate-600">Loading your documents...</p>
      ) : documents.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-[#D7DEE8] px-6 py-10 text-center">
          <FileText size={28} className="mx-auto text-[#17324D]" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-700">You have not uploaded any documents yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li
              key={doc.document_id}
              className="flex flex-col gap-3 rounded-xl border border-[#D7DEE8] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <FileText size={22} className="mt-0.5 shrink-0 text-[#17324D]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{doc.document_name}</p>
                  <p className="text-xs text-slate-600">
                    {doc.upload_date && `Uploaded ${formatDate(doc.upload_date)} · `}
                    {doc._count.extracted_items} extracted items
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[doc.processing_status] || 'bg-slate-100 text-slate-700'}`}>
                  {doc.processing_status}
                </span>
                {doc.processing_status === 'processed' && (
                  <Link
                    to={`/documents/${doc.document_id}`}
                    className="text-sm font-semibold text-[#168C83] hover:text-[#116B65] hover:underline"
                  >
                    View<span className="sr-only"> {doc.document_name}</span>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  )
}

export default MyDocuments
