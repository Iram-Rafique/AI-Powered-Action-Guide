import { useCallback, useEffect, useState } from 'react'

// Reads text aloud with the browser's built-in speech (Web Speech API).
// No extra library or service is needed. Some browsers (e.g. Chrome with
// online voices) may send the text to their own servers to speak it, so a
// local British English voice is chosen first where one is available.
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speakingId, setSpeakingId] = useState(null)

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeakingId(null)
  }, [supported])

  // speak(text, id): id says which button started it, so only that button shows "Stop"
  const speak = useCallback(
    (text, id) => {
      if (!supported) return
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const voice =
        voices.find((v) => v.lang === 'en-GB' && v.localService) ||
        voices.find((v) => v.lang === 'en-GB') ||
        voices.find((v) => v.lang.startsWith('en'))
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang || 'en-GB'
      utterance.rate = 0.95

      utterance.onend = () => setSpeakingId(null)
      utterance.onerror = () => setSpeakingId(null)

      setSpeakingId(id)
      window.speechSynthesis.speak(utterance)
    },
    [supported]
  )

  // Stop speaking when the user leaves the page
  useEffect(() => stop, [stop])

  return { supported, speakingId, speak, stop }
}