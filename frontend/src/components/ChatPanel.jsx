import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MessageCircle, Mic, RotateCcw, SendHorizontal, Square, X } from 'lucide-react'
import { askDocument } from '../services/documentService'
import { endSession } from '../utils/session'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

const SUGGESTIONS = ['What do I need to do first?', 'When is my next deadline?', 'What should I have ready?']
const MAX_LENGTH = 1000

// Shows an answer with simple formatting: **bold** and lines starting with "- " or "* " as a list.
// React escapes all text, so nothing in an answer can run as code.
function AnswerText({ text }) {
  const bold = (line) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
    )

  const blocks = []
  text.split('\n').forEach((line) => {
    const bullet = line.match(/^\s*[-*•]\s+(.*)/)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'list') last.items.push(bullet[1])
      else blocks.push({ type: 'list', items: [bullet[1]] })
    } else if (line.trim()) {
      blocks.push({ type: 'p', text: line })
    }
  })

  return blocks.map((block, i) =>
    block.type === 'list' ? (
      <ul key={i} className="my-1 list-disc space-y-0.5 pl-5">
        {block.items.map((item, j) => <li key={j}>{bold(item)}</li>)}
      </ul>
    ) : (
      <p key={i} className="[&:not(:first-child)]:mt-2">{bold(block.text)}</p>
    )
  )
}

// "Ask about this letter": a chat about one document. Users can type or speak.
// Answers come only from the document's extracted items (see the backend).
function ChatPanel({ documentId, documentName }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // { role: 'user' | 'assistant', text }
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState('')

  const triggerRef = useRef(null)
  const inputRef = useRef(null)
  const endRef = useRef(null)

  const ask = async (question, history = messages) => {
    const text = question.trim()
    if (!text || waiting) return

    const next = [...history, { role: 'user', text }]
    setMessages(next)
    setInput('')
    setError('')
    setWaiting(true)

    try {
      const data = await askDocument(documentId, next.slice(-20))
      setMessages([...next, { role: 'assistant', text: data.answer }])
    } catch (err) {
      if (err.status === 401) return endSession(navigate)
      setError(err.message)
    } finally {
      setWaiting(false)
    }
  }

  // Speaking: the question is sent as soon as the user stops talking
  const speech = useSpeechRecognition((spoken) => ask(spoken))

  // Retry the last question after an error
  const retry = () => {
    const last = messages[messages.length - 1]
    if (last?.role === 'user') ask(last.text, messages.slice(0, -1))
  }

  // Keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, waiting, error])

  // Focus the text box when the panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Esc closes the chat, wherever the focus is
  const stopListening = speech.stop
  useEffect(() => {
    if (!open) return undefined
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        stopListening()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, stopListening])

  const close = () => {
    speech.stop()
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ask(input)
    }
  }

  return (
    <>
      {/* Button that opens the chat */}
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-navy pl-4 pr-5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(30,42,68,0.3)] transition hover:bg-navy-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 sm:bottom-8 sm:right-8"
        >
          <MessageCircle size={19} className="text-coral" aria-hidden="true" />
          Ask about this letter
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Ask about this letter"
          className="fixed inset-x-0 bottom-0 z-40 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-sand bg-white shadow-[0_8px_40px_rgba(30,42,68,0.25)] sm:inset-x-auto sm:bottom-8 sm:right-8 sm:h-[600px] sm:max-h-[calc(100vh-4rem)] sm:w-[400px] sm:rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b-[3px] border-coral bg-ink px-5 py-4">
            <MessageCircle size={20} className="shrink-0 text-coral" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-white">Ask about this letter</h2>
              <p className="truncate text-xs text-white/70">{documentName}</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close chat"
              className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto bg-cream/50 px-4 py-4" aria-live="polite">
            {messages.length === 0 && !waiting && (
              <div className="px-1 pt-2">
                <p className="text-sm text-ink">
                  Ask anything about your actions, dates and details. {speech.supported ? 'Type, or tap the microphone and speak.' : ''}
                </p>
                <div className="mt-4 flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => ask(suggestion)}
                      className="rounded-full border border-sand bg-white px-3.5 py-2 text-left text-sm text-ink transition hover:border-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="space-y-3">
              {messages.map((message, i) => (
                <li key={i} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-navy text-white'
                        : 'rounded-bl-md border border-sand bg-white text-ink'
                    }`}
                  >
                    <span className="sr-only">{message.role === 'user' ? 'You: ' : 'Assistant: '}</span>
                    {message.role === 'user' ? message.text : <AnswerText text={message.text} />}
                  </div>
                </li>
              ))}

              {waiting && (
                <li className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-sand bg-white px-4 py-3 text-sm text-muted">
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    Checking your Action Guide...
                  </div>
                </li>
              )}
            </ul>

            {error && (
              <div role="alert" className="mt-3 rounded-xl border border-urgent-border bg-urgent-bg px-4 py-3 text-sm text-urgent">
                {error}
                {messages[messages.length - 1]?.role === 'user' && (
                  <button
                    type="button"
                    onClick={retry}
                    className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-4"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    Try again
                  </button>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Type or speak */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="border-t border-sand bg-white px-4 pb-3 pt-3"
          >
            {speech.error && (
              <p role="alert" className="mb-2 text-xs text-urgent">{speech.error}</p>
            )}

            <div
              className={`flex items-end gap-2 rounded-xl border bg-white p-1.5 transition focus-within:ring-2 focus-within:ring-navy/15 ${
                speech.listening ? 'border-coral' : 'border-field focus-within:border-navy'
              }`}
            >
              <label htmlFor="chat-input" className="sr-only">Your question</label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                value={speech.listening ? speech.interim : input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                readOnly={speech.listening}
                maxLength={MAX_LENGTH}
                placeholder={speech.listening ? 'Listening...' : 'Ask a question'}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-ink outline-none placeholder:text-subtle"
              />

              {speech.supported && (
                <button
                  type="button"
                  onClick={speech.listening ? speech.stop : speech.start}
                  disabled={waiting}
                  aria-label={speech.listening ? 'Stop listening' : 'Ask by speaking'}
                  aria-pressed={speech.listening}
                  title={speech.listening ? 'Stop listening' : 'Ask by speaking'}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy disabled:opacity-50 ${
                    speech.listening ? 'animate-pulse bg-coral text-ink' : 'text-muted hover:bg-cream hover:text-ink'
                  }`}
                >
                  {speech.listening ? <Square size={15} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
                </button>
              )}

              <button
                type="submit"
                disabled={waiting || speech.listening}
                aria-label="Send question"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white transition hover:bg-navy-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <SendHorizontal size={17} aria-hidden="true" />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] leading-4 text-muted">
              Answers use your Action Guide only and may be wrong. Check your original letter.
            </p>
          </form>
        </section>
      )}
    </>
  )
}

export default ChatPanel