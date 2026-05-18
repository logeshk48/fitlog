import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, SkipForward } from 'lucide-react'
import './RestTimer.css'

const PRESETS = [30, 60, 90, 120]

function RestTimer({ onClose }) {
  const [seconds, setSeconds] = useState(60)
  const [timeLeft, setTimeLeft] = useState(60)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running) return
    if (timeLeft === 0) { setRunning(false); return }
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
  const circumference = 2 * Math.PI * 45
  const offset = circumference * (1 - progress / 100)

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const isDone = timeLeft === 0

  // Color changes as time runs out
  const getColor = () => {
    if (progress > 60) return '#4ECDC4'
    if (progress > 30) return '#FFE66D'
    return '#FF6B6B'
  }

  return (
    <motion.div
      className="rt-wrap"
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      {/* Header */}
      <div className="rt-header">
        <div className="rt-header-left">
          <div className="rt-icon-box">
            <motion.div
              animate={{ rotate: running ? 360 : 0 }}
              transition={{ duration: 2, repeat: running ? Infinity : 0, ease: 'linear' }}
            >
              ⏱
            </motion.div>
          </div>
          <div>
            <p className="rt-title">REST TIMER</p>
            <p className="rt-status">
              {isDone ? 'Ready to go!' : running ? 'Recovering...' : 'Paused'}
            </p>
          </div>
        </div>
        <motion.button
          className="rt-close"
          onClick={onClose}
          whileTap={{ scale: 0.88 }}
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* Circle Timer */}
      <div className="rt-circle-wrap">
        <svg className="rt-svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="rtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={getColor()} />
              <stop offset="100%" stopColor={getColor() === '#4ECDC4' ? '#3B82F6' : getColor()} />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="6"
          />
          {/* Progress */}
          <motion.circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={`url(#rtGrad)`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
              filter: `drop-shadow(0 0 8px ${getColor()}80)`,
              transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease'
            }}
          />
        </svg>

        {/* Time Display */}
        <div className="rt-display">
          <AnimatePresence mode="wait">
            {isDone ? (
              <motion.div
                key="done"
                className="rt-done-text"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                GO!
              </motion.div>
            ) : (
              <motion.span
                key={timeLeft}
                className="rt-time"
                style={{ color: getColor(), textShadow: `0 0 20px ${getColor()}60` }}
                initial={{ scale: 1.1, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {formatTime(timeLeft)}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="rt-label">
            {isDone ? 'Next set!' : running ? 'resting' : 'paused'}
          </span>
        </div>
      </div>

      {/* Presets */}
      <div className="rt-presets">
        {PRESETS.map(s => (
          <motion.button
            key={s}
            className={`rt-preset ${seconds === s ? 'active' : ''}`}
            onClick={() => reset(s)}
            whileTap={{ scale: 0.92 }}
            style={seconds === s ? {
              borderColor: getColor(),
              color: getColor(),
              boxShadow: `0 4px 14px ${getColor()}40`,
              background: `${getColor()}15`
            } : {}}
          >
            {s}s
          </motion.button>
        ))}
      </div>

      {/* Skip Button */}
      <motion.button
        className="rt-skip"
        onClick={onClose}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        <SkipForward size={15} />
        SKIP REST
      </motion.button>
    </motion.div>
  )
}

export default RestTimer