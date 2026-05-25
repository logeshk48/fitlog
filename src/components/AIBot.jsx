import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import './AIBot.css'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

const QUICK_PROMPTS = [
  "What should I train today?",
  "How's my progress this week?",
  "Am I overtraining?",
  "Give me a chest workout",
]

export default function AIBot({ workouts, profile }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const isProfilePage = window.location.hash.includes('/profile')
  if (isProfilePage) return null

  function buildSystemPrompt() {
    let bestLift = 0
    workouts.forEach(w => {
      w.exercises?.forEach(ex => {
        ex.sets?.forEach(s => {
          if (s.weight > bestLift) bestLift = s.weight
        })
      })
    })

    const streak = computeStreak(workouts)

    const recentMuscles = workouts.slice(0, 5).map(w => {
      const muscles = [...new Set(w.exercises?.map(ex => ex.muscleGroup).filter(Boolean))]
      const date = w.createdAt?.toDate ? w.createdAt.toDate().toDateString() : ''
      return `${date}: ${muscles.join(', ') || 'unknown'}`
    })

    return `You are FitBot, a friendly personal fitness coach inside the FitLog app. Be concise, motivating, and practical. Use short responses — max 3-4 sentences or a short list. Never be overly verbose.

USER DATA:
- Name: ${profile?.name || 'Athlete'}
- Goal: ${profile?.goal || 'Not set'}
- Level: ${profile?.fitnessLevel || 'Not set'}
- Height: ${profile?.height || '?'}cm
- Weight: ${profile?.weight || '?'}kg
- Age: ${profile?.age || '?'}
- Target weight: ${profile?.targetWeight || '?'}kg
- Total workouts: ${workouts.length}
- Current streak: ${streak} days
- Best lift: ${bestLift > 0 ? bestLift + 'kg' : 'none recorded'}
- Recent sessions: ${recentMuscles.join(' | ') || 'none'}

Keep responses short and actionable. If suggesting a workout, format exercises as a simple list. Always be encouraging and personalized.`
  }

  function computeStreak(workouts) {
    if (!workouts.length) return 0
    const dates = workouts
      .filter(w => w.createdAt)
      .map(w => {
        const d = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt)
        return d.toDateString()
      })
    const unique = [...new Set(dates)].map(d => new Date(d)).sort((a, b) => b - a)
    let streak = 0
    let current = new Date()
    current.setHours(0, 0, 0, 0)
    for (const d of unique) {
      const diff = Math.round((current - d) / (1000 * 60 * 60 * 24))
      if (diff <= 1) { streak++; current = d } else break
    }
    return streak
  }

  async function sendMessage(text) {
    const userMsg = text || input.trim()
    if (!userMsg) return

    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildSystemPrompt() }]
            },
            {
              role: 'model',
              parts: [{ text: 'Understood! I am FitBot, your personal fitness coach. How can I help you today?' }]
            },
            ...newMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }))
          ],
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.7,
          }
        })
      })

      const data = await response.json()
      console.log('Gemini response:', data)

      let reply = ''
      if (data.error?.code === 429) {
        reply = 'Too many requests! Please wait a moment and try again. 🙏'
      } else if (data.error) {
        reply = `Error: ${data.error.message || 'Something went wrong. Please try again!'}`
      } else {
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text
          || 'Sorry, I could not generate a response. Please try again!'
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error('Gemini error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Network error. Please check your connection and try again!'
      }])
    }

    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleOpen() {
    setOpen(true)
    if (messages.length === 0) {
      const hour = new Date().getHours()
      const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
      const name = profile?.name?.split(' ')[0] || 'Athlete'
      setMessages([{
        role: 'assistant',
        content: `Good ${greeting}, ${name}! 💪 I'm FitBot, your personal AI coach. Ask me anything — workout suggestions, progress checks, exercise tips, or what to train today!`
      }])
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        className={`fitbot-fab ${open ? 'open' : ''}`}
        onClick={open ? () => setOpen(false) : handleOpen}
      >
        {open ? '✕' : '✦'}
      </button>

      {/* Chat modal */}
      {open && (
        <div className="fitbot-modal">

          {/* Header */}
          <div className="fitbot-header">
            <div className="fitbot-header-left">
              <div className="fitbot-avatar">✦</div>
              <div>
                <p className="fitbot-name">FITBOT</p>
                <p className="fitbot-status">
                  <span className="fitbot-dot" />
                  Powered by Gemini
                </p>
              </div>
            </div>
            <button
              className="fitbot-minimize"
              onClick={() => setOpen(false)}
            >−</button>
          </div>

          {/* Messages */}
          <div className="fitbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`fitbot-msg ${m.role}`}>
                {m.role === 'assistant' && (
                  <span className="fitbot-msg-avatar">✦</span>
                )}
                <div className="fitbot-bubble">
                  {m.content.split('\n').map((line, j) => (
                    line ? <p key={j} className="fitbot-line">{line}</p> : null
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="fitbot-msg assistant">
                <span className="fitbot-msg-avatar">✦</span>
                <div className="fitbot-bubble fitbot-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="fitbot-quick">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q}
                  className="fitbot-quick-btn"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="fitbot-input-row">
            <textarea
              className="fitbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask your coach..."
              rows={1}
              disabled={loading}
            />
            <button
              className="fitbot-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              →
            </button>
          </div>

        </div>
      )}
    </>
  )
}