import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListChecks, CalendarClock, ClipboardList, Info, AlertTriangle } from 'lucide-react'
import AppLayout from '../layouts/AppLayout'
import { getDocument, updateActionStatus } from '../services/documentService'
import { endSession, formatDate } from '../utils/session'

function Section({ icon: Icon, title, id, children }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-[#D7DEE8] p-5 sm:p-6">
      <h2 id={id} className="mb-4 flex items-center gap-2 text-base font-bold text-[#17324D]">
        <Icon size={20} className="text-[#168C83]" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  )
}

const Empty = ({ text }) => <p className="text-sm text-slate-600">{text}</p>

function DocumentResult() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [document, setDocument] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true })
      return
    }

    getDocument(id)
      .then((data) => setDocument(data.document))
      .catch((err) => {
        if (err.status === 401) return endSession(navigate)
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [id, navigate])

  // Tick or untick an action. The checkbox updates straight away and is
  // reverted if the server returns an error.
  const toggleAction = async (item) => {
    const newStatus = item.action_status === 'completed' ? 'pending' : 'completed'
    const setStatus = (status) =>
      setDocument((prev) => ({
        ...prev,
        extracted_items: prev.extracted_items.map((i) =>
          i.item_id === item.item_id ? { ...i, action_status: status } : i
        ),
      }))

    setUpdateError('')
    setStatus(newStatus)

    try {
      await updateActionStatus(item.item_id, newStatus)
    } catch (err) {
      if (err.status === 401) return endSession(navigate)
      setStatus(item.action_status)
      setUpdateError(err.message)
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <p role="status" className="text-center text-sm text-slate-600">Loading your Action Guide...</p>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        <Link to="/my-documents" className="mt-4 inline-block text-sm font-semibold text-[#168C83] hover:underline">
          Back to My Documents
        </Link>
      </AppLayout>
    )
  }

  const items = document.extracted_items
  const actions = items.filter((i) => i.item_type === 'action')
  const details = items.filter((i) => i.item_type === 'detail')

  // Dates & Deadlines: important dates plus any action that has a due date, in date order
  const datedItems = [
    ...items.filter((i) => i.item_type === 'date'),
    ...actions.filter((i) => i.due_date),
  ].sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date) - new Date(b.due_date)
  })

  return (
    <AppLayout>
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#17324D] sm:text-2xl">
          Your Action Guide
        </h1>
        <p className="mt-1 break-all text-sm text-slate-600">
          {document.document_name}
          {document.upload_date && ` · uploaded ${formatDate(document.upload_date)}`}
        </p>
      </div>

      {/* AI notice and disclaimer (FR10) */}
      <div role="note" className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Extracted by AI – please check.</strong> This information may be incomplete or
          incorrect, so always compare it with your original document. It is general information
          only and is not legal, medical or financial advice.
        </p>
      </div>

      {updateError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{updateError}</p>
      )}

      <div className="space-y-5">
        {/* Required Actions */}
        <Section icon={ListChecks} title="Required Actions" id="actions-heading">
          {actions.length === 0 ? (
            <Empty text="No actions were found in this document." />
          ) : (
            <ul className="space-y-3">
              {actions.map((item) => {
                const done = item.action_status === 'completed'
                return (
                  <li key={item.item_id} className="flex items-start gap-3">
                    <input
                      id={`action-${item.item_id}`}
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleAction(item)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#168C83]"
                    />
                    <label htmlFor={`action-${item.item_id}`} className="text-sm">
                      <span className={done ? 'text-slate-500 line-through' : 'font-medium text-slate-800'}>
                        {item.description}
                      </span>
                      <span className="mt-0.5 block text-xs">
                        {item.due_date ? (
                          <span className="text-slate-600">Due by {formatDate(item.due_date)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-800">
                            <AlertTriangle size={13} aria-hidden="true" />
                            Deadline not identified – check the document
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        {/* Dates & Deadlines */}
        <Section icon={CalendarClock} title="Dates & Deadlines" id="dates-heading">
          {datedItems.length === 0 ? (
            <Empty text="No dates were found in this document." />
          ) : (
            <ul className="divide-y divide-[#D7DEE8]">
              {datedItems.map((item) => (
                <li key={`date-${item.item_id}`} className="flex flex-col gap-0.5 py-2.5 text-sm sm:flex-row sm:gap-4">
                  <span className="shrink-0 font-semibold text-[#17324D] sm:w-40">
                    {item.due_date ? formatDate(item.due_date) : 'Date not identified'}
                  </span>
                  <span className="text-slate-700">
                    {item.item_type === 'action' ? `Deadline: ${item.description}` : item.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Important Details */}
        <Section icon={ClipboardList} title="Important Details" id="details-heading">
          {details.length === 0 ? (
            <Empty text="No other details were found in this document." />
          ) : (
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              {details.map((item) => (
                <li key={item.item_id}>{item.description}</li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/upload"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#17324D] px-5 text-sm font-semibold text-white transition hover:bg-[#244766] focus:outline-none focus:ring-2 focus:ring-[#17324D] focus:ring-offset-2"
        >
          Upload another document
        </Link>
        <Link
          to="/my-documents"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[#D7DEE8] px-5 text-sm font-semibold text-[#17324D] transition hover:border-[#17324D] focus:outline-none focus:ring-2 focus:ring-[#17324D]"
        >
          My Documents
        </Link>
      </div>
    </AppLayout>
  )
}

export default DocumentResult
