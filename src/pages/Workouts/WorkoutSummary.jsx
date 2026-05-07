import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { saveWorkout } from '../../hooks/useFirestore'
import './WorkoutSummary.css'

function WorkoutSummary({ workout, onDone }) {
  const { user } = useContext(AuthContext)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    handleSave()
  }, [])

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
      if (result.success) {
        setSaved(true)
      } else {
        setError('Failed to save workout')
      }
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

  return (
    <div className="summary-page">

      {/* Trophy */}
      <div className="summary-trophy">
        <div className="trophy-icon">🏆</div>
        <h1 className="summary-title">Workout Complete!</h1>
        <p className="summary-subtitle">
          {saving ? 'Saving your workout...' :
           saved ? '✅ Saved to your history!' :
           error ? '⚠️ ' + error : ''}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="summary-stats">
        <div className="summary-stat">
          <span className="summary-stat-value">{formatTime(workout.duration)}</span>
          <span className="summary-stat-label">Duration</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{totalSets}</span>
          <span className="summary-stat-label">Sets Done</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{workout.exercises.length}</span>
          <span className="summary-stat-label">Exercises</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{workout.totalVolume.toFixed(0)}kg</span>
          <span className="summary-stat-label">Volume</span>
        </div>
      </div>

      {/* Exercise Breakdown */}
      <div className="summary-breakdown">
        <h3 className="breakdown-title">Exercise Breakdown</h3>
        {workout.exercises.map((ex, i) => (
          <div key={i} className="breakdown-card">
            <div className="breakdown-name">{ex.name}</div>
            <div className="breakdown-sets">
              {ex.sets.filter(s => s.done).map((set, si) => (
                <span key={si} className="breakdown-set">
                  {set.reps} × {set.weight}kg
                </span>
              ))}
              {ex.sets.filter(s => s.done).length === 0 && (
                <span className="breakdown-skipped">Skipped</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Done Button */}
      <div className="summary-actions">
        <button className="done-btn" onClick={onDone}>
          Back to Workout
        </button>
      </div>

    </div>
  )
}

export default WorkoutSummary