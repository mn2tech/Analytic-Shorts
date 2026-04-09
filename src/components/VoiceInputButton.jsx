import { useRef, useState } from 'react'

export default function VoiceInputButton({ onTranscript, disabled = false }) {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => (
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  ))

  const handleVoiceInput = () => {
    if (!supported || disabled) return

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionCtor()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.continuous = false

      recognition.onstart = () => setListening(true)
      recognition.onend = () => setListening(false)
      recognition.onerror = () => setListening(false)
      recognition.onresult = (event) => {
        const text = event?.results?.[0]?.[0]?.transcript?.trim()
        if (text) onTranscript?.(text)
      }
      recognitionRef.current = recognition
    }

    if (listening) {
      recognitionRef.current.stop()
      return
    }
    recognitionRef.current.start()
  }

  return (
    <button
      type="button"
      onClick={handleVoiceInput}
      disabled={disabled || !supported}
      title={supported ? 'Voice input' : 'Voice input not supported in this browser'}
      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
        listening
          ? 'border-rose-400/60 bg-rose-500/20 text-rose-200'
          : 'border-white/15 bg-slate-800 text-slate-200 hover:bg-slate-700'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
      aria-label="Voice input"
    >
      🎤
    </button>
  )
}
