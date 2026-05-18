import { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock, Zap, Dumbbell, TrendingUp, RotateCcw } from 'lucide-react'
import { AuthContext } from '../../context/AuthContext'
import { saveWorkout } from '../../hooks/useFirestore'
import './WorkoutSummary.css'

function WorkoutSummary({ workout, onDone }) {
  const { user } = useContext(AuthContext)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { handleSave() }, [])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const workoutToSave = {
        exercises: workout.exercises.map(ex => ({
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          equipmentType: ex.equipmentType,
          difficulty: ex.difficulty,
          sets: ex.sets.filter(s => s.done).map(s => ({
            reps: s.reps || 0,
            weight: s.weight || 0,
            done: true
          }))
        })),
        duration: workout.duration,
        totalVolume: workout.totalVolume,
        totalSets: workout.totalSets,
        date: workout.date,
        muscleGroups: [...new Set(workout.exercises.map(ex => ex.muscleGroup))]
      }
      const result = await saveWorkout(user.uid, workoutToSave)
      if (result.success) setSaved(true)
      else setError('Failed to save workout')
    } catch (err) {
      setError('Failed to save workout')
    }
    setSaving(false)
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const totalSets = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.done).length, 0
  )

  const stats = [
    { value: formatTime(workout.duration), label: 'DURATION', color: '#FF6B6B', icon: <Clock size={16} /> },
    { value: totalSets, label: 'SETS DONE', color: '#4ECDC4', icon: <Zap size={16} /> },
    { value: workout.exercises.length, label: 'EXERCISES', color: '#A855F7', icon: <Dumbbell size={16} /> },
    { value: `${workout.totalVolume.toFixed(0)}kg`, label: 'VOLUME', color: '#F97316', icon: <TrendingUp size={16} /> },
  ]

  return (
    <div className="ws-page">

      {/* Hero Section */}
      <div className="ws-hero">
        {/* Animated trophy */}
        <motion.div
          className="ws-trophy"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <motion.div
            className="ws-trophy-ring ws-ring-1"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="ws-trophy-ring ws-ring-2"
            animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.05, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
          <span className="ws-trophy-icon">🏆</span>
        </motion.div>

        <motion.h1
          className="ws-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          WORKOUT COMPLETE!
        </motion.h1>

        <motion.div
          className="ws-save-status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {saving && (
            <motion.div
              className="ws-status saving"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <div className="ws-spinner" />
              <span>Saving workout...</span>
            </motion.div>
          )}
          {saved && (
            <motion.div
              className="ws-status saved"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <CheckCircle size={14} />
              <span>Saved to history!</span>
            </motion.div>
          )}
          {error && (
            <div className="ws-status error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="ws-stats">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className="ws-stat"
            style={{
              '--sc': stat.color,
              borderColor: `${stat.color}30`,
              background: `${stat.color}08`
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <div className="ws-stat-icon" style={{ color: stat.color, background: `${stat.color}15` }}>
              {stat.icon}
            </div>
            <span className="ws-stat-val" style={{ color: stat.color, textShadow: `0 0 16px ${stat.color}50` }}>
              {stat.value}
            </span>
            <span className="ws-stat-lbl">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Exercise Breakdown */}
      <motion.div
        className="ws-breakdown"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <p className="ws-breakdown-title">EXERCISE BREAKDOWN</p>
        {workout.exercises.map((ex, i) => {
          const doneSets = ex.sets.filter(s => s.done)
          return (
            <motion.div
              key={i}
              className="ws-ex-card"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
            >
              <div className="ws-ex-header">
                <span className="ws-ex-name">{ex.name}</span>
                <span className="ws-ex-sets-count">{doneSets.length} sets</span>
              </div>
              <div className="ws-ex-sets">
                {doneSets.length > 0 ? (
                  doneSets.map((set, si) => (
                    <motion.span
                      key={si}
                      className="ws-set-pill"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + si * 0.04, type: 'spring', stiffness: 300 }}
                    >
                      {set.reps} × {set.weight}kg
                    </motion.span>
                  ))
                ) : (
                  <span className="ws-skipped">Skipped</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Done Button */}
      <div className="ws-actions">
        <motion.button
          className="ws-done-btn"
          onClick={onDone}
          whileHover={{ scale: 1.02, boxShadow: '0 14px 36px rgba(255,107,107,0.55)' }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <RotateCcw size={18} />
          BACK TO WORKOUT
        </motion.button>
      </div>

    </div>
  )
}

export default WorkoutSummary