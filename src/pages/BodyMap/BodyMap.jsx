import { useRef, useEffect, useState, useContext } from 'react'
import { BodyChart, ViewSide, MUSCLE_GROUPS } from 'body-muscles'
import { AuthContext } from '../../context/AuthContext'
import { getWorkouts } from '../../hooks/useFirestore'
import './BodyMap.css'

// Map exercise names / workout types → body-muscles IDs
const EXERCISE_MUSCLE_MAP = {
  // Chest
  'bench press': ['chest-upper-left', 'chest-upper-right', 'chest-lower-left', 'chest-lower-right'],
  'chest press': ['chest-upper-left', 'chest-upper-right'],
  'push up': ['chest-upper-left', 'chest-upper-right', 'triceps-left', 'triceps-right'],
  'chest fly': ['chest-upper-left', 'chest-upper-right', 'chest-lower-left', 'chest-lower-right'],
  'incline press': ['chest-upper-left', 'chest-upper-right'],
  'decline press': ['chest-lower-left', 'chest-lower-right'],

  // Back
  'pull up': ['latissimus-dorsi-left', 'latissimus-dorsi-right', 'biceps-left', 'biceps-right'],
  'lat pulldown': ['latissimus-dorsi-left', 'latissimus-dorsi-right'],
  'row': ['latissimus-dorsi-left', 'latissimus-dorsi-right', 'trapezius-middle-left', 'trapezius-middle-right'],
  'deadlift': ['latissimus-dorsi-left', 'latissimus-dorsi-right', 'gluteus-maximus-left', 'gluteus-maximus-right', 'hamstrings-left', 'hamstrings-right'],
  'pull down': ['latissimus-dorsi-left', 'latissimus-dorsi-right'],

  // Shoulders
  'shoulder press': ['deltoid-anterior-left', 'deltoid-anterior-right', 'deltoid-lateral-left', 'deltoid-lateral-right'],
  'lateral raise': ['deltoid-lateral-left', 'deltoid-lateral-right'],
  'front raise': ['deltoid-anterior-left', 'deltoid-anterior-right'],
  'overhead press': ['deltoid-anterior-left', 'deltoid-anterior-right', 'triceps-left', 'triceps-right'],
  'arnold press': ['deltoid-anterior-left', 'deltoid-anterior-right', 'deltoid-lateral-left', 'deltoid-lateral-right'],

  // Biceps
  'curl': ['biceps-left', 'biceps-right'],
  'bicep curl': ['biceps-left', 'biceps-right'],
  'hammer curl': ['biceps-left', 'biceps-right', 'brachioradialis-left', 'brachioradialis-right'],
  'chin up': ['biceps-left', 'biceps-right', 'latissimus-dorsi-left', 'latissimus-dorsi-right'],

  // Triceps
  'tricep': ['triceps-left', 'triceps-right'],
  'triceps': ['triceps-left', 'triceps-right'],
  'dip': ['triceps-left', 'triceps-right', 'chest-lower-left', 'chest-lower-right'],
  'skull crusher': ['triceps-left', 'triceps-right'],
  'pushdown': ['triceps-left', 'triceps-right'],

  // Legs
  'squat': ['quadriceps-left', 'quadriceps-right', 'gluteus-maximus-left', 'gluteus-maximus-right'],
  'leg press': ['quadriceps-left', 'quadriceps-right', 'gluteus-maximus-left', 'gluteus-maximus-right'],
  'lunge': ['quadriceps-left', 'quadriceps-right', 'gluteus-maximus-left', 'gluteus-maximus-right'],
  'leg extension': ['quadriceps-left', 'quadriceps-right'],
  'leg curl': ['hamstrings-left', 'hamstrings-right'],
  'hamstring': ['hamstrings-left', 'hamstrings-right'],
  'calf raise': ['gastrocnemius-left', 'gastrocnemius-right'],
  'calf': ['gastrocnemius-left', 'gastrocnemius-right'],

  // Glutes
  'hip thrust': ['gluteus-maximus-left', 'gluteus-maximus-right'],
  'glute bridge': ['gluteus-maximus-left', 'gluteus-maximus-right'],
  'rdl': ['hamstrings-left', 'hamstrings-right', 'gluteus-maximus-left', 'gluteus-maximus-right'],

  // Abs
  'crunch': ['rectus-abdominis-upper', 'rectus-abdominis-lower'],
  'plank': ['rectus-abdominis-upper', 'rectus-abdominis-lower', 'obliques-left', 'obliques-right'],
  'ab': ['rectus-abdominis-upper', 'rectus-abdominis-lower'],
  'sit up': ['rectus-abdominis-upper', 'rectus-abdominis-lower'],
  'russian twist': ['obliques-left', 'obliques-right'],
  'leg raise': ['rectus-abdominis-lower', 'hip-flexors-left', 'hip-flexors-right'],

  // Traps
  'shrug': ['trapezius-upper-left', 'trapezius-upper-right'],
  'trap': ['trapezius-upper-left', 'trapezius-upper-right'],
  'face pull': ['trapezius-middle-left', 'trapezius-middle-right', 'deltoid-posterior-left', 'deltoid-posterior-right'],
}

// Workout type → default muscles if no exercise match
const TYPE_MUSCLE_MAP = {
  strength: ['chest-upper-left', 'chest-upper-right', 'biceps-left', 'biceps-right', 'triceps-left', 'triceps-right'],
  cardio: ['quadriceps-left', 'quadriceps-right', 'hamstrings-left', 'hamstrings-right', 'gastrocnemius-left', 'gastrocnemius-right'],
  flexibility: ['hamstrings-left', 'hamstrings-right', 'obliques-left', 'obliques-right'],
  sports: ['quadriceps-left', 'quadriceps-right', 'deltoid-lateral-left', 'deltoid-lateral-right'],
}

function getMuscleCounts(workouts, timeFilter) {
  const now = new Date()
  const filtered = workouts.filter((w) => {
    if (!w.createdAt) return false
    const d = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt)
    if (timeFilter === 'week') return now - d <= 7 * 24 * 60 * 60 * 1000
    if (timeFilter === 'month') return now - d <= 30 * 24 * 60 * 60 * 1000
    return true
  })

  const counts = {}

  filtered.forEach((w) => {
    const musclesHit = new Set()

    // Try to match exercises
    if (w.exercises?.length) {
      w.exercises.forEach((ex) => {
        const name = ex.name?.toLowerCase() || ''
        Object.entries(EXERCISE_MUSCLE_MAP).forEach(([key, muscles]) => {
          if (name.includes(key)) muscles.forEach((m) => musclesHit.add(m))
        })
      })
    }

    // Fallback to workout type
    if (musclesHit.size === 0 && w.type) {
      const defaults = TYPE_MUSCLE_MAP[w.type] || []
      defaults.forEach((m) => musclesHit.add(m))
    }

    musclesHit.forEach((m) => { counts[m] = (counts[m] || 0) + 1 })
  })

  return counts
}

function countsToBodyState(counts) {
  const max = Math.max(...Object.values(counts), 1)
  const state = {}
  Object.entries(counts).forEach(([id, count]) => {
    const intensity = Math.min(10, Math.round((count / max) * 10))
    state[id] = { intensity, selected: false }
  })
  return state
}

const MUSCLE_LABEL_MAP = {
  'chest-upper-left': 'Chest', 'chest-upper-right': 'Chest',
  'chest-lower-left': 'Lower Chest', 'chest-lower-right': 'Lower Chest',
  'biceps-left': 'Biceps', 'biceps-right': 'Biceps',
  'triceps-left': 'Triceps', 'triceps-right': 'Triceps',
  'deltoid-anterior-left': 'Front Shoulder', 'deltoid-anterior-right': 'Front Shoulder',
  'deltoid-lateral-left': 'Side Shoulder', 'deltoid-lateral-right': 'Side Shoulder',
  'deltoid-posterior-left': 'Rear Delt', 'deltoid-posterior-right': 'Rear Delt',
  'latissimus-dorsi-left': 'Lats', 'latissimus-dorsi-right': 'Lats',
  'trapezius-upper-left': 'Traps', 'trapezius-upper-right': 'Traps',
  'trapezius-middle-left': 'Mid Traps', 'trapezius-middle-right': 'Mid Traps',
  'quadriceps-left': 'Quads', 'quadriceps-right': 'Quads',
  'hamstrings-left': 'Hamstrings', 'hamstrings-right': 'Hamstrings',
  'gluteus-maximus-left': 'Glutes', 'gluteus-maximus-right': 'Glutes',
  'gastrocnemius-left': 'Calves', 'gastrocnemius-right': 'Calves',
  'rectus-abdominis-upper': 'Upper Abs', 'rectus-abdominis-lower': 'Lower Abs',
  'obliques-left': 'Obliques', 'obliques-right': 'Obliques',
  'brachioradialis-left': 'Forearms', 'brachioradialis-right': 'Forearms',
  'hip-flexors-left': 'Hip Flexors', 'hip-flexors-right': 'Hip Flexors',
}

export default function BodyMap() {
  const { user } = useContext(AuthContext)
  const frontRef = useRef(null)
  const backRef = useRef(null)
  const frontChartRef = useRef(null)
  const backChartRef = useRef(null)

  const [workouts, setWorkouts] = useState([])
  const [timeFilter, setTimeFilter] = useState('week')
  const [selectedMuscle, setSelectedMuscle] = useState(null)
  const [muscleCounts, setMuscleCounts] = useState({})
  const [loading, setLoading] = useState(true)

  // Load workouts
  useEffect(() => {
    async function load() {
      const data = await getWorkouts(user.uid)
      setWorkouts(data)
      setLoading(false)
    }
    load()
  }, [user])

  // Init charts
  useEffect(() => {
    if (!frontRef.current || !backRef.current) return

    frontChartRef.current = new BodyChart(frontRef.current, {
      view: ViewSide.FRONT,
      bodyState: {},
      showViewLabel: false,
      enableTransitions: true,
      onMuscleClick: (id, name) => {
        setSelectedMuscle({ id, name: MUSCLE_LABEL_MAP[id] || name })
      },
    })

    backChartRef.current = new BodyChart(backRef.current, {
      view: ViewSide.BACK,
      bodyState: {},
      showViewLabel: false,
      enableTransitions: true,
      onMuscleClick: (id, name) => {
        setSelectedMuscle({ id, name: MUSCLE_LABEL_MAP[id] || name })
      },
    })

    return () => {
      frontChartRef.current?.destroy()
      backChartRef.current?.destroy()
    }
  }, [])

  // Update body state when workouts or filter changes
  useEffect(() => {
    if (loading) return
    const counts = getMuscleCounts(workouts, timeFilter)
    setMuscleCounts(counts)
    const bodyState = countsToBodyState(counts)
    frontChartRef.current?.update({ bodyState })
    backChartRef.current?.update({ bodyState })
  }, [workouts, timeFilter, loading])

  // Get exercises that hit selected muscle
  function getExercisesForMuscle(muscleId) {
    const results = []
    workouts.forEach((w) => {
      w.exercises?.forEach((ex) => {
        const name = ex.name?.toLowerCase() || ''
        const hit = Object.entries(EXERCISE_MUSCLE_MAP).some(([key, muscles]) =>
          name.includes(key) && muscles.includes(muscleId)
        )
        if (hit) {
          const date = w.createdAt?.toDate ? w.createdAt.toDate() : new Date(w.createdAt)
          results.push({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          })
        }
      })
    })
    return results.slice(0, 5)
  }

  const trainedCount = Object.keys(muscleCounts).length
  const totalMuscles = 20

  return (
    <div className="bodymap-root">
      {/* Header */}
      <div className="bodymap-header">
        <h1 className="bodymap-title">BODY MAP</h1>
        <p className="bodymap-sub">Tap a muscle to see details</p>
      </div>

      {/* Time filter */}
      <div className="bodymap-filters">
        {['week', 'month', 'all'].map((f) => (
          <button
            key={f}
            className={`bodymap-filter-btn ${timeFilter === f ? 'active' : ''}`}
            onClick={() => setTimeFilter(f)}
          >
            {f === 'week' ? 'THIS WEEK' : f === 'month' ? 'THIS MONTH' : 'ALL TIME'}
          </button>
        ))}
      </div>

      {/* Coverage stat */}
      <div className="bodymap-coverage">
        <div className="coverage-bar-wrap">
          <div className="coverage-bar">
            <div
              className="coverage-fill"
              style={{ width: `${Math.round((trainedCount / totalMuscles) * 100)}%` }}
            />
          </div>
          <span className="coverage-label">
            {trainedCount}/{totalMuscles} muscle groups trained
          </span>
        </div>
      </div>

      {/* Body charts — front and back side by side */}
      <div className="bodymap-charts">
        <div className="bodymap-chart-wrap">
          <p className="chart-label">FRONT</p>
          <div ref={frontRef} className="bodymap-chart" />
        </div>
        <div className="bodymap-chart-wrap">
          <p className="chart-label">BACK</p>
          <div ref={backRef} className="bodymap-chart" />
        </div>
      </div>

      {/* Legend */}
      <div className="bodymap-legend">
        <span className="legend-label">NOT TRAINED</span>
        <div className="legend-scale">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={i}
              className="legend-block"
              style={{ opacity: i / 10 }}
            />
          ))}
        </div>
        <span className="legend-label">MOST TRAINED</span>
      </div>

      {/* Empty state */}
      {!loading && workouts.length === 0 && (
        <div className="bodymap-empty">
          <p>💪</p>
          <p>Log workouts to see your body map!</p>
        </div>
      )}

      {/* Bottom sheet - selected muscle */}
      {selectedMuscle && (
        <div className="muscle-sheet-overlay" onClick={() => setSelectedMuscle(null)}>
          <div className="muscle-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="muscle-sheet-handle" />
            <div className="muscle-sheet-header">
              <h2 className="muscle-sheet-name">{selectedMuscle.name}</h2>
              <span className="muscle-sheet-count">
                {muscleCounts[selectedMuscle.id] || 0} times trained
              </span>
              <button className="muscle-sheet-close" onClick={() => setSelectedMuscle(null)}>✕</button>
            </div>

            {(() => {
              const exercises = getExercisesForMuscle(selectedMuscle.id)
              return exercises.length > 0 ? (
                <div className="muscle-sheet-exercises">
                  <p className="muscle-sheet-label">RECENT EXERCISES</p>
                  {exercises.map((ex, i) => (
                    <div className="muscle-ex-row" key={i}>
                      <div className="muscle-ex-info">
                        <span className="muscle-ex-name">{ex.name}</span>
                        <span className="muscle-ex-date">{ex.date}</span>
                      </div>
                      <span className="muscle-ex-detail">
                        {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ''}
                        {ex.weight ? ` · ${ex.weight}kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muscle-sheet-none">No exercises recorded for this muscle yet.</p>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}