import { useState, useEffect, useRef } from 'react'
import RestTimer from './RestTimer'
import './ActiveWorkout.css'

function ActiveWorkout({ exercises, onFinish, onBack }) {
  const [workoutExercises, setWorkoutExercises] = useState(
    exercises.map(ex => ({
      ...ex,
      sets: [{ reps: '', weight: '', done: false, note: '' }]
    }))
  )
  const [showTimer, setShowTimer] = useState(false)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [newPRs, setNewPRs] = useState([])

  // Workout clock
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
      i === exIndex
        ? { ...ex, sets: [...ex.sets, { reps: '', weight: '', done: false, note: '' }] }
        : ex
    ))
  }

  const removeSet = (exIndex, setIndex) => {
    setWorkoutExercises(prev => prev.map((ex, i) =>
      i === exIndex
        ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIndex) }
        : ex
    ))
  }

  const updateSet = (exIndex, setIndex, field, value) => {
    setWorkoutExercises(prev => prev.map((ex, i) =>
      i === exIndex
        ? {
            ...ex,
            sets: ex.sets.map((set, si) =>
              si === setIndex ? { ...set, [field]: value } : set
            )
          }
        : ex
    ))
  }

  const completeSet = (exIndex, setIndex) => {
    setWorkoutExercises(prev => prev.map((ex, i) =>
      i === exIndex
        ? {
            ...ex,
            sets: ex.sets.map((set, si) =>
              si === setIndex ? { ...set, done: !set.done } : set
            )
          }
        : ex
    ))
    setShowTimer(true)
  }

  const totalSetsCompleted = workoutExercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.done).length, 0
  )

  const totalVolume = workoutExercises.reduce((acc, ex) =>
    acc + ex.sets.reduce((a, s) =>
      a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0
    ), 0
  )

  const handleFinish = () => {
    const duration = Math.floor((Date.now() - startTime) / 1000)
    onFinish({
      exercises: workoutExercises,
      duration,
      totalVolume,
      totalSets: totalSetsCompleted,
      date: new Date().toISOString(),
    })
  }

  return (
    <div className="active-workout">

      {/* Header */}
      <div className="active-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="workout-timer">{formatTime(elapsedTime)}</div>
        <button className="finish-btn" onClick={handleFinish}>Finish</button>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{totalSetsCompleted}</span>
          <span className="stat-label">Sets Done</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">{workoutExercises.length}</span>
          <span className="stat-label">Exercises</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">{totalVolume.toFixed(0)}kg</span>
          <span className="stat-label">Volume</span>
        </div>
      </div>

      {/* Rest Timer */}
      {showTimer && (
        <RestTimer onClose={() => setShowTimer(false)} />
      )}

      {/* Exercise Cards */}
      <div className="exercise-logger">
        {workoutExercises.map((ex, exIndex) => (
          <div key={ex.name} className="logger-card">

            {/* Exercise Header */}
            <div className="logger-header">
              <div>
                <h3 className="logger-name">{ex.name}</h3>
                <span className={`difficulty-badge ${ex.difficulty.toLowerCase()}`}>
                  {ex.difficulty}
                </span>
              </div>
              <button
                className="add-set-btn"
                onClick={() => addSet(exIndex)}
              >
                + Set
              </button>
            </div>

            {/* Sets Table Header */}
            <div className="sets-header">
              <span>SET</span>
              <span>REPS</span>
              <span>KG</span>
              <span>DONE</span>
            </div>

            {/* Sets */}
            {ex.sets.map((set, setIndex) => (
              <div key={setIndex} className={`set-row ${set.done ? 'done' : ''}`}>
                <span className="set-number">{setIndex + 1}</span>
                <input
                  type="number"
                  className="set-input"
                  placeholder="0"
                  value={set.reps}
                  onChange={e => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                />
                <input
                  type="number"
                  className="set-input"
                  placeholder="0"
                  value={set.weight}
                  onChange={e => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                />
                <button
                  className={`done-btn ${set.done ? 'done' : ''}`}
                  onClick={() => completeSet(exIndex, setIndex)}
                >
                  ✓
                </button>
              </div>
            ))}

          </div>
        ))}
      </div>

      {/* Finish Button */}
      <div className="finish-bar">
        <button className="finish-workout-btn" onClick={handleFinish}>
          🏁 Finish Workout
        </button>
      </div>

    </div>
  )
}

export default ActiveWorkout