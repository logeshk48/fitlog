import { useState, useEffect } from 'react'
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
      i === exIndex
        ? {
            ...ex,
            sets: [...ex.sets, {
              reps: ex.sets[ex.sets.length - 1].reps,
              weight: ex.sets[ex.sets.length - 1].weight,
              done: false
            }]
          }
        : ex
    ))
  }

  const updateValue = (exIndex, setIndex, field, delta) => {
    setWorkoutExercises(prev => prev.map((ex, i) =>
      i === exIndex
        ? {
            ...ex,
            sets: ex.sets.map((set, si) =>
              si === setIndex
                ? { ...set, [field]: Math.max(0, (set[field] || 0) + delta) }
                : set
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
    setCompletedSet(`${exIndex}-${setIndex}`)
    setTimeout(() => setCompletedSet(null), 1000)
    setShowTimer(true)
  }

  const totalSetsCompleted = workoutExercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.done).length, 0
  )

  const totalVolume = workoutExercises.reduce((acc, ex) =>
    acc + ex.sets.reduce((a, s) =>
      a + (s.weight || 0) * (s.reps || 0), 0
    ), 0
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
          <span className="stat-value" style={{color: 'var(--color-primary)'}}>
            {totalSetsCompleted}
          </span>
          <span className="stat-label">Sets Done</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value" style={{color: 'var(--color-secondary)'}}>
            {workoutExercises.length}
          </span>
          <span className="stat-label">Exercises</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value" style={{color: 'var(--color-orange)'}}>
            {totalVolume}kg
          </span>
          <span className="stat-label">Volume</span>
        </div>
      </div>

      {/* Rest Timer */}
      {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}

      {/* Exercises */}
      <div className="exercise-logger">
        {workoutExercises.map((ex, exIndex) => (
          <div key={ex.name} className="logger-card">

            {/* Exercise Header */}
            <div className="logger-ex-header">
              <div className="logger-ex-info">
                <h3 className="logger-name">{ex.name}</h3>
                <span className={`difficulty-badge ${ex.difficulty.toLowerCase()}`}>
                  {ex.difficulty}
                </span>
              </div>
              <button className="add-set-btn" onClick={() => addSet(exIndex)}>
                + Set
              </button>
            </div>

            {/* Sets */}
            <div className="sets-list">
              {ex.sets.map((set, setIndex) => (
                <div
                  key={setIndex}
                  className={`set-block ${set.done ? 'done' : ''} ${completedSet === `${exIndex}-${setIndex}` ? 'pop' : ''}`}
                >
                  {/* Set Top Row */}
                  <div className="set-top-row">
                    <span className="set-label">SET {setIndex + 1}</span>
                    {set.done && (
                      <span className="set-done-indicator">✓ Completed</span>
                    )}
                  </div>

                  {/* Side by side counters */}
                  <div className="counters-row">
                    <div className="counter-group">
                      <span className="counter-label">REPS</span>
                      <div className="counter">
                        <button
                          className="counter-btn"
                          onClick={() => updateValue(exIndex, setIndex, 'reps', -1)}
                        >−</button>
                        <span className="counter-value">{set.reps}</span>
                        <button
                          className="counter-btn"
                          onClick={() => updateValue(exIndex, setIndex, 'reps', 1)}
                        >+</button>
                      </div>
                    </div>

                    {ex.equipmentType === 'With Weight' && (
                      <div className="counter-group">
                        <span className="counter-label">KG</span>
                        <div className="counter">
                          <button
                            className="counter-btn"
                            onClick={() => updateValue(exIndex, setIndex, 'weight', -2.5)}
                          >−</button>
                          <span className="counter-value">{set.weight}</span>
                          <button
                            className="counter-btn"
                            onClick={() => updateValue(exIndex, setIndex, 'weight', 2.5)}
                          >+</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Complete Button */}
                  <button
                    className={`complete-set-btn ${set.done ? 'done' : ''}`}
                    onClick={() => completeSet(exIndex, setIndex)}
                  >
                    {set.done ? '✓ Done!' : 'Complete Set'}
                  </button>

                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

      {/* Finish Bar */}
      <div className="finish-bar">
        <button className="finish-workout-btn" onClick={handleFinish}>
          🏁 Finish Workout
        </button>
      </div>

    </div>
  )
}

export default ActiveWorkout