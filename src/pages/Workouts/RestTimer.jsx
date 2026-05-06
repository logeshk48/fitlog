import { useState, useEffect } from 'react'
import './RestTimer.css'

const PRESETS = [30, 60, 90, 120]

function RestTimer({ onClose }) {
  const [seconds, setSeconds] = useState(60)
  const [timeLeft, setTimeLeft] = useState(60)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running) return
    if (timeLeft === 0) {
      setRunning(false)
      return
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [running, timeLeft])

  const reset = (secs) => {
    setSeconds(secs)
    setTimeLeft(secs)
    setRunning(true)
  }

  const progress = (timeLeft / seconds) * 100

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <div className="rest-timer">
      <div className="timer-header">
        <span className="timer-title">Rest Timer</span>
        <button className="timer-close" onClick={onClose}>✕</button>
      </div>

      <div className="timer-circle-wrap">
        <svg className="timer-svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" className="timer-track" />
          <circle
            cx="50" cy="50" r="45"
            className="timer-progress"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          />
        </svg>
        <div className="timer-display">
          <span className="timer-time">{formatTime(timeLeft)}</span>
          <span className="timer-label">{running ? 'resting' : 'done!'}</span>
        </div>
      </div>

      <div className="timer-presets">
        {PRESETS.map(s => (
          <button
            key={s}
            className={`preset-btn ${seconds === s ? 'active' : ''}`}
            onClick={() => reset(s)}
          >
            {s}s
          </button>
        ))}
      </div>

      <button className="timer-skip" onClick={onClose}>
        Skip Rest →
      </button>
    </div>
  )
}

export default RestTimer