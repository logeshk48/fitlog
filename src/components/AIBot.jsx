import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './AIBot.css';

const QUICK_PROMPTS = [
  "What should I train today?",
  "How's my progress this week?",
  "Am I overtraining?",
  "Give me a chest workout",
];

export default function AIBot({ workouts, profile }) {
  // ✅ ALL hooks first — no early returns before this
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ✅ Early return AFTER all hooks
  const isProfilePage = window.location.hash.includes('/profile');
  if (isProfilePage) return null;

  function buildSystemPrompt() {
    const typeCount = {};
    workouts.forEach((w) => { typeCount[w.type] = (typeCount[w.type] || 0) + 1; });

    let bestLift = 0;
    workouts.forEach((w) => {
      w.exercises?.forEach((e) => {
        if (parseFloat(e.weight) > bestLift) bestLift = parseFloat(e.weight);
      });
      if (parseFloat(w.weight) > bestLift) bestLift = parseFloat(w.weight);
    });

    const recent = workouts.slice(0, 5).map((w) => ({
      name: w.name,
      type: w.type,
      date: w.createdAt?.toDate ? w.createdAt.toDate().toDateString() : '',
      exercises: w.exercises?.map((e) => `${e.name} ${e.sets}x${e.reps} ${e.weight}kg`).join(', '),
    }));

    const streak = computeStreak(workouts);

    return `You are FitBot, a friendly personal fitness coach inside the FitLog app. Be concise, motivating, and practical. Use short responses — max 3-4 sentences or a short list. Never be overly verbose.

USER DATA:
- Goal: ${profile.goal || 'Not set'}
- Level: ${profile.level || 'Not set'}  
- Height: ${profile.body?.height || '?'}cm, Weight: ${profile.body?.weight || '?'}kg, Age: ${profile.body?.age || '?'}
- Target weight: ${profile.body?.target || '?'}kg
- Total workouts: ${workouts.length}
- Current streak: ${streak} days
- Best lift: ${bestLift > 0 ? bestLift + 'kg' : 'none recorded'}
- Workout types: ${JSON.stringify(typeCount)}
- Last 5 sessions: ${JSON.stringify(recent)}

Keep responses short and actionable. If suggesting a workout, format exercises as a simple list.`;
  }

  function computeStreak(workouts) {
    if (!workouts.length) return 0;
    const dates = workouts
      .filter((w) => w.createdAt)
      .map((w) => {
        const d = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt);
        return d.toDateString();
      });
    const unique = [...new Set(dates)].map((d) => new Date(d)).sort((a, b) => b - a);
    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);
    for (const d of unique) {
      const diff = Math.round((current - d) / (1000 * 60 * 60 * 24));
      if (diff <= 1) { streak++; current = d; } else break;
    }
    return streak;
  }

  async function sendMessage(text) {
    const userMsg = text || input.trim();
    if (!userMsg) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const history = [
      ...messages,
      { role: 'user', content: userMsg },
    ];

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystemPrompt(),
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Sorry, something went wrong.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
    }
    setLoading(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleOpen() {
    setOpen(true);
    if (messages.length === 0) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      setMessages([{
        role: 'assistant',
        content: `Good ${greeting}! 💪 I'm FitBot, your personal coach. Ask me anything — workout suggestions, progress checks, exercise tips, or just what to train today!`,
      }]);
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
                  Your AI Coach
                </p>
              </div>
            </div>
            <button className="fitbot-minimize" onClick={() => setOpen(false)}>−</button>
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
              {QUICK_PROMPTS.map((q) => (
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
              onChange={(e) => setInput(e.target.value)}
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
  );
}