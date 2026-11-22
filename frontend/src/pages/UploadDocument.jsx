import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Camera,
  FileText,
  ListChecks,
  CalendarClock,
  ClipboardList,
  Info,
  X,
} from 'lucide-react'
import AppLayout from '../layouts/AppLayout'
import { uploadDocument } from '../services/documentService'
import { endSession } from '../utils/session'

// Supported file types (must match the backend validation)
const ACCEPTED_TYPES = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png']
const ACCEPTED_EXTENSIONS = ['pdf', 'txt', 'jpg', 'jpeg', 'png']
const MAX_SIZE_MB = 5

// Explains the three sections the extracted information will be shown in
const CATEGORIES = [
  {
    icon: ListChecks,
    title: 'Required Actions',
    text: 'Tasks you need to complete, shown as a checklist.',
  },
  {
    icon: CalendarClock,
    title: 'Dates & Deadlines',
    text: 'Appointment dates, times and response deadlines.',
  },
  {
    icon: ClipboardList,
    title: 'Important Details',
    text: 'Locations, reference numbers and other key information.',
  },
]

function UploadDocument() {
  const navigate = useNavigate()
  const cameraInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Only logged-in users can upload documents
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  // Check the file type and size before uploading
  const validateFile = (selectedFile) => {
    const extension = selectedFile.name.split('.').pop().toLowerCase()
    const typeAllowed =
      ACCEPTED_TYPES.includes(selectedFile.type) ||
      ACCEPTED_EXTENSIONS.includes(extension)

    if (!typeAllowed) {
      return 'Please choose a PDF, TXT, JPG or PNG file.'
    }

    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      return `The file must be smaller than ${MAX_SIZE_MB} MB.`
    }

    return ''
  }

  const handleFile = (selectedFile) => {
    if (!selectedFile) return

    const message = validateFile(selectedFile)

    if (message) {
      setFile(null)
      setError(message)
      return
    }

    setError('')
    setFile(selectedFile)
  }

  const handleInputChange = (e) => {
    handleFile(e.target.files[0])
    // Allow the same file to be selected again after removing it
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleRemove = () => {
    setFile(null)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isUploading) return

    if (!file) {
      setError('Please choose a document to upload.')
      return
    }

    try {
      setIsUploading(true)
      setError('')

      const data = await uploadDocument(file)

      // Show the Action Guide for the new document
      navigate(`/documents/${data.document_id}`)
    } catch (err) {
      if (err.status === 401) {
        // Token missing or expired: ask the user to log in again
        endSession(navigate)
        return
      }

      setError(err.message || 'Unable to upload the document. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const formatSize = (bytes) =>
    bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <AppLayout>
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold tracking-tight text-[#17324D] sm:text-2xl">
          Upload a document
        </h1>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Upload an administrative letter and the Action Guide will organise what you
          need to do, and by when.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* Drop zone: the label makes the whole area open the file picker */}
        <label
          htmlFor="document"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition focus-within:ring-2 focus-within:ring-[#17324D] ${
            isDragging
              ? 'border-[#168C83] bg-[#168C83]/5'
              : error
                ? 'border-red-500'
                : 'border-[#D7DEE8] hover:border-[#17324D]'
          }`}
        >
          <Upload size={32} strokeWidth={2} className="text-[#17324D]" aria-hidden="true" />

          <span className="mt-3 text-sm font-semibold text-slate-800">
            Drag and drop your document here, or{' '}
            <span className="text-[#168C83] underline">choose a file</span>
          </span>

          <span id="file-hint" className="mt-1 text-xs text-slate-600">
            PDF, TXT, JPG or PNG, up to {MAX_SIZE_MB} MB
          </span>

          <input
            id="document"
            name="document"
            type="file"
            accept=".pdf,.txt,.jpg,.jpeg,.png"
            onChange={handleInputChange}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'file-hint upload-error' : 'file-hint'}
            className="sr-only"
          />
        </label>

        {/* Take a photo (opens the camera on mobile devices) */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-[#D7DEE8] px-4 py-2 text-sm font-semibold text-[#17324D] transition hover:border-[#17324D] focus:outline-none focus:ring-2 focus:ring-[#17324D]"
          >
            <Camera size={18} aria-hidden="true" />
            Take a photo
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
        </div>

        {/* Selected file */}
        {file && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#D7DEE8] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText size={22} className="shrink-0 text-[#17324D]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-600">{formatSize(file.size)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              aria-label={`Remove ${file.name}`}
              className="rounded p-1 text-slate-500 transition hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-[#17324D]"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p
            id="upload-error"
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isUploading}
          className="h-12 w-full rounded-lg bg-[#17324D] px-4 text-sm font-semibold text-white transition hover:bg-[#244766] focus:outline-none focus:ring-2 focus:ring-[#17324D] focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? 'Reading your document... this can take a few seconds' : 'Upload and create Action Guide'}
        </button>
      </form>

      {/* Disclaimer (FR10) */}
      <div
        role="note"
        className="mt-6 flex gap-3 rounded-lg border border-[#D7DEE8] bg-[#F7F9FC] px-4 py-3 text-xs leading-5 text-slate-700"
      >
        <Info size={18} className="mt-0.5 shrink-0 text-[#17324D]" aria-hidden="true" />
        <p>
          The Action Guide uses AI to organise information from your document. Results may
          be incomplete or incorrect, so always check them against the original document.
          This is general information only and is not legal, medical or financial advice.
          Please upload only the synthetic test documents provided for this project.
        </p>
      </div>

      {/* What will be extracted */}
      <section aria-labelledby="categories-heading" className="mt-10">
        <h2 id="categories-heading" className="mb-4 text-center text-base font-bold text-[#17324D]">
          What the Action Guide will show you
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {CATEGORIES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-[#D7DEE8] p-5">
              <Icon size={24} className="text-[#168C83]" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  )
}

export default UploadDocument
