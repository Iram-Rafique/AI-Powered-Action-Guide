import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  UploadCloud,
  X,
} from 'lucide-react'
import AppLayout from '../layouts/AppLayout'
import { uploadDocument } from '../services/documentService'
import { endSession } from '../utils/session'

// Supported file types (must match the backend validation)
const ACCEPTED_TYPES = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png']
const ACCEPTED_EXTENSIONS = ['pdf', 'txt', 'jpg', 'jpeg', 'png']
const MAX_SIZE_MB = 5

// The three sections the extracted information will be shown in (Section 3.6.4.1)
const CATEGORIES = ['Required actions', 'Dates & deadlines', 'Important details']

// Stages shown while the document is processed. The server does not report its
// progress, so the stages move on a timer; the last one stays until it finishes.
const STAGES = [
  { label: 'Uploading your document', after: 0 },
  { label: 'Reading the letter', after: 1500 },
  { label: 'Finding actions and dates', after: 4000 },
  { label: 'Checking the deadlines', after: 8000 },
]

const isImageFile = (file) => file?.type === 'image/jpeg' || file?.type === 'image/png'

const formatSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

function UploadDocument() {
  const navigate = useNavigate()
  const cameraInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  // True when the error came from the server rather than from checking the file
  const [isServerError, setIsServerError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [stage, setStage] = useState(0)

  // Thumbnail for photos, so users can check the image is clear before uploading
  const previewUrl = useMemo(
    () => (isImageFile(file) ? URL.createObjectURL(file) : null),
    [file]
  )
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  // Move through the progress stages while uploading
  useEffect(() => {
    if (!isUploading) return undefined
    const timers = STAGES.slice(1).map((s, i) => setTimeout(() => setStage(i + 1), s.after))
    return () => timers.forEach(clearTimeout)
  }, [isUploading])

  // Check the file type and size before uploading
  const validateFile = (selectedFile) => {
    const extension = selectedFile.name.split('.').pop().toLowerCase()
    const typeAllowed =
      ACCEPTED_TYPES.includes(selectedFile.type) || ACCEPTED_EXTENSIONS.includes(extension)

    if (!typeAllowed) return 'Please choose a PDF, TXT, JPG or PNG file.'
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      return `The file must be smaller than ${MAX_SIZE_MB} MB.`
    }
    return ''
  }

  const handleFile = (selectedFile) => {
    if (!selectedFile) return

    const message = validateFile(selectedFile)
    setIsServerError(false)
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
      setIsServerError(false)
      setError('Please choose a document to upload.')
      return
    }

    try {
      setStage(0)
      setIsUploading(true)
      setError('')

      const data = await uploadDocument(file)

      // Show the Action Guide for the new document
      navigate(`/documents/${data.document_id}`)
    } catch (err) {
      if (err.status === 401) {
        endSession(navigate)
        return
      }
      setIsServerError(true)
      setError(err.message || 'Unable to upload the document. Please try again.')
      setIsUploading(false)
    }
  }

  return (
    <AppLayout>
      {/* Heading */}
      <div className="mb-6">
        <div className="mb-3 h-1 w-12 rounded-full bg-coral" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Upload a document</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          Upload an administrative letter and the Action Guide will organise what you need to do, and by when.
        </p>

        {/* What the user will get */}
        <ul aria-label="Your Action Guide will show" className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <li
              key={category}
              className="inline-flex items-center gap-1.5 rounded-full border border-sand bg-white px-3 py-1 text-xs font-medium text-ink"
            >
              <Check size={14} className="text-coral" aria-hidden="true" />
              {category}
            </li>
          ))}
        </ul>
      </div>

      <section className="rounded-2xl border border-sand bg-white p-5 shadow-[0_8px_30px_rgba(30,42,68,0.06)] sm:p-7">
        {isUploading ? (
          /* Progress while the document is being processed */
          <div role="status" aria-live="polite" className="py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-coral">
                <Loader2 size={22} className="animate-spin" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink">Creating your Action Guide</p>
                <p className="truncate text-sm text-muted">{file?.name} · this usually takes a few seconds</p>
              </div>
            </div>

            <ol className="mt-6 space-y-3">
              {STAGES.map((s, i) => {
                const done = i < stage
                const current = i === stage
                return (
                  <li key={s.label} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        done
                          ? 'border-done bg-done text-white'
                          : current
                            ? 'border-coral text-coral'
                            : 'border-sand text-subtle'
                      }`}
                    >
                      {done ? (
                        <Check size={14} aria-hidden="true" />
                      ) : current ? (
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <span className="text-[11px] font-semibold">{i + 1}</span>
                      )}
                    </span>
                    <span className={done ? 'text-muted' : current ? 'font-semibold text-ink' : 'text-subtle'}>
                      {s.label}
                      {done && <span className="sr-only"> (done)</span>}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Drop zone: the label makes the whole area open the file picker */}
            <label
              htmlFor="document"
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition focus-within:ring-2 focus-within:ring-navy ${
                isDragging
                  ? 'border-coral bg-coral/5'
                  : error && !isServerError
                    ? 'border-urgent bg-urgent-bg/40'
                    : 'border-field/60 bg-cream/60 hover:border-navy hover:bg-cream'
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-coral shadow-sm">
                <UploadCloud size={28} aria-hidden="true" />
              </span>

              <span className="mt-4 text-sm font-semibold text-ink">
                {isDragging ? 'Drop your document here' : (
                  <>Drag and drop your document, or <span className="text-coral-text underline underline-offset-4">choose a file</span></>
                )}
              </span>

              <span id="file-hint" className="mt-1 text-xs text-muted">
                PDF, TXT, JPG or PNG · up to {MAX_SIZE_MB} MB
              </span>

              <input
                id="document"
                name="document"
                type="file"
                accept=".pdf,.txt,.jpg,.jpeg,.png"
                onChange={handleInputChange}
                aria-invalid={Boolean(error) && !isServerError}
                aria-describedby={error ? 'file-hint upload-error' : 'file-hint'}
                className="sr-only"
              />
            </label>

            {/* Take a photo (opens the camera on mobile devices) */}
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-sand" aria-hidden="true" />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-field px-4 py-2 text-sm font-semibold text-ink transition hover:border-navy hover:bg-cream focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <Camera size={18} className="text-coral" aria-hidden="true" />
                Take a photo
              </button>
              <span className="h-px flex-1 bg-sand" aria-hidden="true" />
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
              <div className="mt-5 flex items-center gap-4 rounded-xl border border-sand bg-white p-3">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview of the selected photo"
                    className="h-16 w-16 shrink-0 rounded-lg border border-sand object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-cream text-coral">
                    <FileText size={26} aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-done">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Ready to upload · {formatSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-md p-2 text-muted transition hover:bg-urgent-bg hover:text-urgent focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <p
                id="upload-error"
                role="alert"
                className="mt-5 rounded-lg border border-urgent-border bg-urgent-bg px-4 py-3 text-sm text-urgent"
              >
                {error}{' '}
                {/* Failed documents are kept, so the user can find them later */}
                {isServerError && (
                  <Link to="/my-documents" className="font-semibold underline underline-offset-4">
                    View My Documents
                  </Link>
                )}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="mt-5 h-12 w-full rounded-lg bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 active:scale-[0.99]"
            >
              Create Action Guide
            </button>
          </form>
        )}
      </section>

      {/* Disclaimer (FR10) */}
      <div role="note" className="mt-5 flex gap-3 px-1 text-xs leading-5 text-muted">
        <Info size={16} className="mt-0.5 shrink-0 text-coral" aria-hidden="true" />
        <p>
          <span className="font-semibold text-ink">AI-generated – please check.</span> Results may be
          incomplete or incorrect, so always compare them with your original document. This is general
          information only and is not legal, medical or financial advice. Please upload only the synthetic
          test documents provided for this project.
        </p>
      </div>
    </AppLayout>
  )
}

export default UploadDocument