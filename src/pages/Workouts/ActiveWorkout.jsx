import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CheckCircle, Plus, Flag } from 'lucide-react'
import RestTimer from './RestTimer'
import './ActiveWorkout.css'

function ActiveWorkout({ exercises, onFinish, onBack }) {
  const [workoutExercises, setWorkoutExercises] = useState(
    exercises.map(ex => ({
      ...ex,
      sets: [{ reps: 10, weight: 0, done: false }]
    }))
  )
  const [showTimer, setShowTimer] = useState(false)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [completedSet, setCompletedSet] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const addSet = (exIndex) => {
    setWorkoutExercises(prev => prev.map((ex, i) =>
      i === exIndex ? {
        ...ex,
        sets: [...ex.sets, {
          reps: ex.sets[ex.sets.length - 1].reps,
          weight: ex.sets[ex.sets.length - 1].weight,
          done: false
        }]
      } : ex
    ))
  }

  const updateValue = (exIndex, setIndex, field, delta) => {
    setWorkoutExercises(prev => prev.map((ex, i) =>
      i === exIndex ? {
        ...ex,
        sets: ex.sets.map((set, si) =>
          si === setIndex
            ? { ...set, [field]: Math.max(0, (set[field] || 0) + delta) }
            : set
        )
      } : ex
    ))
  }

  const completeSet = (exIndex, setIndex) => {
    setWorkoutExercises(prev => prev.map((ex, i) =>
      i === exIndex ? {
        ...ex,
        sets: ex.sets.map((set, si) =>
          si === setIndex ? { ...set, done: !set.done } : set
        )
      } : ex
    ))
    setCompletedSet(`${exIndex}-${setIndex}`)
    setTimeout(() => setCompletedSet(null), 1000)
    setShowTimer(true)
  }

  const totalSetsCompleted = workoutExercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.done).length, 0
  )

  const totalVolume = workoutExercises.reduce((acc, ex) =>
    acc + ex.sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0), 0
  )

  const handleFinish = () => {
    onFinish({
      exercises: workoutExercises,
      duration: Math.floor((Date.now() - startTime) / 1000),
      totalVolume,
      totalSets: totalSetsCompleted,
      date: new Date().toISOString(),
    })
  }

  return (
    <div className="aw-root">

      {/* Header */}
      <div className="aw-header">
        <motion.button
          className="aw-back-btn"
          onClick={onBack}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft size={18} />
        </motion.button>

        <div className="aw-timer-wrap">
          <motion.span
            className="aw-timer"
            key={Math.floor(elapsedTime / 60)}
            animate={{ scale: [1.05, 1] }}
            transition={{ duration: 0.3 }}
          >
            {formatTime(elapsedTime)}
          </motion.span>
          <span className="aw-timer-label">ELAPSED</span>
        </div>

        <motion.button
          className="aw-finish-btn"
          onClick={handleFinish}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
        >
          <Flag size={14} />
          <span>FINISH</span>
        </motion.button>
      </div>

      {/* Stats Bar */}
      <div className="aw-stats">
        {[
          { value: totalSetsCompleted, label: 'SETS DONE', color: '#FF6B6B' },
          { value: workoutExercises.length, label: 'EXERCISES', color: '#4ECDC4' },
          { value: `${totalVolume}kg`, label: 'VOLUME', color: '#F97316' },
        ].map((stat, i) => (
          <div key={i} className="aw-stat">
            <motion.span
              className="aw-stat-val"
              style={{ color: stat.color, textShadow: `0 0 16px ${stat.color}60` }}
              key={stat.value}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {stat.value}
            </motion.span>
            <span className="aw-stat-lbl">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Rest Timer */}
      <AnimatePresence>
        {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
      </AnimatePresence>

      {/* Exercise Logger */}
      <div className="aw-logger">
        {workoutExercises.map((ex, exIndex) => (
          <motion.div
            key={ex.name}
            className="aw-ex-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: exIndex * 0.06 }}
          >
            {/* Exercise Header */}
            <div className="aw-ex-header">
              <div className="aw-ex-info">
                <h3 className="aw-ex-name">{ex.name}</h3>
                <span className={`aw-difficulty ${ex.difficulty.toLowerCase()}`}>
                  {ex.difficulty}
                </span>
              </div>
              <motion.button
                className="aw-add-set-btn"
                onClick={() => addSet(exIndex)}
                whileTap={{ scale: 0.92 }}
              >
                <Plus size={13} />
                <span>SET</span>
              </motion.button>
            </div>

            {/* Sets */}
            <div className="aw-sets">
              {ex.sets.map((set, setIndex) => (
                <motion.div
                  key={setIndex}
                  className={`aw-set ${set.done ? 'done' : ''} ${completedSet === `${exIndex}-${setIndex}` ? 'pop' : ''}`}
                  layout
                >
                  <div className="aw-set-header">
                    <span className="aw-set-label">SET {setIndex + 1}</span>
                    {set.done && (
                      <motion.span
                        className="aw-set-done"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <CheckCircle size={13} />
                        Completed
                      </motion.span>
                    )}
                  </div>

                  <div className="aw-counters">
                    {/* Reps Counter */}
                    <div className="aw-counter-group">
                      <span className="aw-counter-label">REPS</span>
                      <div className="aw-counter">
                        <motion.button
                          className="aw-counter-btn"
                          onClick={() => updateValue(exIndex, setIndex, 'reps', -1)}
                          whileTap={{ scale: 0.85 }}
                        >−</motion.button>
                        <motion.span
                          className="aw-counter-val"
                          key={set.reps}
                          initial={{ scale: 1.3, opacity: 0.6 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.15 }}
                        >{set.reps}</motion.span>
                        <motion.button
                          className="aw-counter-btn"
                          onClick={() => updateValue(exIndex, setIndex, 'reps', 1)}
                          whileTap={{ scale: 0.85 }}
                        >+</motion.button>
                      </div>
                    </div>

                    {/* Weight Counter */}
                    {ex.equipmentType === 'With Weight' && (
                      <div className="aw-counter-group">
                        <span className="aw-counter-label">KG</span>
                        <div className="aw-counter">
                          <motion.button
                            className="aw-counter-btn"
                            onClick={() => updateValue(exIndex, setIndex, 'weight', -0.5)}
                            whileTap={{ scale: 0.85 }}
                          >−</motion.button>
                          <motion.span
                            className="aw-counter-val"
                            key={set.weight}
                            initial={{ scale: 1.3, opacity: 0.6 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.15 }}
                          >{set.weight}</motion.span>
                          <motion.button
                            className="aw-counter-btn"
                            onClick={() => updateValue(exIndex, setIndex, 'weight', 0.5)}
                            whileTap={{ scale: 0.85 }}
                          >+</motion.button>
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.button
                    className={`aw-complete-btn ${set.done ? 'done' : ''}`}
                    onClick={() => completeSet(exIndex, setIndex)}
                    whileHover={!set.done ? { scale: 1.02 } : {}}
                    whileTap={{ scale: 0.97 }}
                  >
                    {set.done ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="aw-complete-inner"
                      >
                        <CheckCircle size={16} /> DONE
                      </motion.span>
                    ) : 'COMPLETE SET'}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Finish Bar */}
      <div className="aw-finish-bar">
        <motion.button
          className="aw-finish-workout-btn"
          onClick={handleFinish}
          whileHover={{ scale: 1.02, boxShadow: '0 14px 36px rgba(255,107,107,0.55)' }}
          whileTap={{ scale: 0.97 }}
        >
          <Flag size={18} />
          FINISH WORKOUT
        </motion.button>
      </div>

    </div>
  )
}

export default ActiveWorkout