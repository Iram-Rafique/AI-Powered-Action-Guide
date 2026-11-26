import { useCallback, useEffect, useRef, useState } from 'react'

// Speech-to-text with the browser's built-in Web Speech API.
// Works in Chrome, Edge and Safari; not in Firefox (supported is false there).
// Note: Chrome and Edge send the audio to their own speech service to turn it into text.
const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

const ERRORS = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser settings, or type your question.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in your browser settings, or type your question.',
  'no-speech': "I didn't hear anything. Tap the microphone and try again.",
  'audio-capture': 'No microphone was found. Please type your question instead.',
  network: 'Speech recognition needs an internet connection. Please type your question instead.',
}

// onResult(text) is called with the final words once the user stops speaking
export function useSpeechRecognition(onResult) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)

  useEffect(() => {
    onResultRef.current = onResult
  })

  const start = useCallback(() => {
    if (!Recognition) return
    recognitionRef.current?.abort()

    const recognition = new Recognition()
    recognition.lang = 'en-GB'
    recognition.interimResults = true
    recognition.continuous = false

    let finalText = ''

    recognition.onresult = (event) => {
      let liveText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const words = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += words
        else liveText += words
      }
      setInterim(finalText + liveText)
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setError(ERRORS[event.error] || 'Speech recognition stopped. Please try again or type your question.')
      }
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
      recognitionRef.current = null
      if (finalText.trim()) onResultRef.current?.(finalText.trim())
    }

    recognitionRef.current = recognition
    setError('')
    setInterim('')
    setListening(true)
    recognition.start()
  }, [])

  // Stop listening; whatever was heard so far is still sent
  const stop = useCallback(() => recognitionRef.current?.stop(), [])

  // Stop the microphone when the page closes
  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported: Boolean(Recognition), listening, interim, error, start, stop, clearError: () => setError('') }
}