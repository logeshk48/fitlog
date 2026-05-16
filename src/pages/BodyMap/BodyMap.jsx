import { useRef, useEffect, useState, useContext } from 'react'
import { BodyChart, ViewSide } from 'body-muscles'
import { AuthContext } from '../../context/AuthContext'
import { getWorkouts } from '../../hooks/useFirestore'
import { exercises as exerciseLibrary } from '../../data/exercises'
import './BodyMap.css'

// ================================
// MUSCLE GROUP → BODY-MUSCLES IDS
// ================================
const MUSCLE_ID_MAP = {
  'Chest': [
    'chest-upper-left', 'chest-upper-right',
    'chest-lower-left', 'chest-lower-right'
  ],
  'Back': [
    'latissimus-dorsi-left', 'latissimus-dorsi-right',
    'trapezius-upper-left', 'trapezius-upper-right',
    'trapezius-middle-left', 'trapezius-middle-right'
  ],
  'Shoulders': [
    'deltoid-anterior-left', 'deltoid-anterior-right',
    'deltoid-lateral-left', 'deltoid-lateral-right',
    'deltoid-posterior-left', 'deltoid-posterior-right'
  ],
  'Biceps': ['biceps-left', 'biceps-right'],
  'Triceps': ['triceps-left', 'triceps-right'],
  'Forearms': ['brachioradialis-left', 'brachioradialis-right'],
  'Core': [
    'rectus-abdominis-upper', 'rectus-abdominis-lower',
    'obliques-left', 'obliques-right'
  ],
  'Legs': [
    'quadriceps-left', 'quadriceps-right',
    'hamstrings-left', 'hamstrings-right'
  ],
  'Glutes': ['gluteus-maximus-left', 'gluteus-maximus-right'],
  'Calves': ['gastrocnemius-left', 'gastrocnemius-right'],
  'Full Body': [
    'chest-upper-left', 'chest-upper-right',
    'latissimus-dorsi-left', 'latissimus-dorsi-right',
    'deltoid-anterior-left', 'deltoid-anterior-right',
    'biceps-left', 'biceps-right',
    'triceps-left', 'triceps-right',
    'rectus-abdominis-upper', 'rectus-abdominis-lower',
    'quadriceps-left', 'quadriceps-right',
    'hamstrings-left', 'hamstrings-right',
    'gluteus-maximus-left', 'gluteus-maximus-right',
    'gastrocnemius-left', 'gastrocnemius-right',
  ],
  'Hamstrings': ['hamstrings-left', 'hamstrings-right'],
  'Lower Back': ['latissimus-dorsi-left', 'latissimus-dorsi-right'],
  'Hip Flexors': ['hip-flexors-left', 'hip-flexors-right'],
  'Obliques': ['obliques-left', 'obliques-right'],
  'Lower Abs': ['rectus-abdominis-lower'],
  'Upper Back': ['trapezius-middle-left', 'trapezius-middle-right'],
}

// ================================
// INTENSITY → COLOR (shades)
// ================================
function intensityToColor(intensity) {
  if (intensity === 0) return '#2a2a35'
  if (intensity <= 2) return '#FFE66D40'
  if (intensity === 3) return '#FFE66D90'
  if (intensity === 4) return '#FFE66D'
  if (intensity === 5) return '#4ECDC460'
  if (intensity === 6) return '#4ECDC490'
  if (intensity === 7) return '#4ECDC4'
  if (intensity === 8) return '#FF6B6B60'
  if (intensity === 9) return '#FF6B6B90'
  return '#FF6B6B'
}

// ================================
// COMPUTE MUSCLE HITS FROM WORKOUTS
// ================================
function computeMuscleCounts(workouts, timeFilter) {
  const now = new Date()
  const filtered = workouts.filter((w) => {
    const d = w.createdAt?.toDate?.() || new Date(w.date)
    if (timeFilter === 'week') return now - d <= 7 * 24 * 60 * 60 * 1000
    if (timeFilter === 'month') return now - d <= 30 * 24 * 60 * 60 * 1000
    return true
  })

  const primaryCounts = {}
  const secondaryCounts = {}

  filtered.forEach((workout) => {
    workout.exercises?.forEach((ex) => {
      const libEx = exerciseLibrary.find(
        (e) => e.name.toLowerCase() === ex.name?.toLowerCase()
      )

      if (libEx) {
        const primaryIds = MUSCLE_ID_MAP[libEx.muscleGroup] || []
        primaryIds.forEach((id) => {
          primaryCounts[id] = (primaryCounts[id] || 0) + 1
        })
        libEx.secondaryMuscles?.forEach((sec) => {
          const secIds = MUSCLE_ID_MAP[sec] || []
          secIds.forEach((id) => {
            secondaryCounts[id] = (secondaryCounts[id] || 0) + 0.5
          })
        })
      } else if (ex.muscleGroup) {
        const ids = MUSCLE_ID_MAP[ex.muscleGroup] || []
        ids.forEach((id) => {
          primaryCounts[id] = (primaryCounts[id] || 0) + 1
        })
      }
    })
  })

  const combined = { ...primaryCounts }
  Object.entries(secondaryCounts).forEach(([id, count]) => {
    combined[id] = (combined[id] || 0) + count
  })

  return { combined, primaryCounts }
}

function countsToBodyState(combined) {
  const max = Math.max(...Object.values(combined), 1)
  const state = {}
  Object.entries(combined).forEach(([id, count]) => {
    const intensity = Math.min(10, Math.round((count / max) * 10))
    state[id] = { intensity, selected: false }
  })
  return state
}

// ================================
// MUSCLE LABEL MAP
// ================================
const MUSCLE_LABELS = {
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

// ================================
// MAIN COMPONENT
// ================================
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
  const [chartsReady, setChartsReady] = useState(false)

  // Load workouts
  useEffect(() => {
    async function load() {
      const data = await getWorkouts(user.uid)
      setWorkouts(data)
      setLoading(false)
    }
    load()
  }, [user])

  // Init charts with delay to ensure DOM is ready
  useEffect(() => {
    if (!frontRef.current || !backRef.current) return

    const timer = setTimeout(() => {
      frontChartRef.current = new BodyChart(frontRef.current, {
        view: ViewSide.FRONT,
        bodyState: {},
        showViewLabel: false,
        enableTransitions: true,
        onMuscleClick: (id, name) => {
          setSelectedMuscle({
            id,
            name: MUSCLE_LABELS[id] || name,
          })
        },
      })

      backChartRef.current = new BodyChart(backRef.current, {
        view: ViewSide.BACK,
        bodyState: {},
        showViewLabel: false,
        enableTransitions: true,
        onMuscleClick: (id, name) => {
          setSelectedMuscle({
            id,
            name: MUSCLE_LABELS[id] || name,
          })
        },
      })

      setChartsReady(true)
    }, 100)

    return () => {
      clearTimeout(timer)
      frontChartRef.current?.destroy()
      backChartRef.current?.destroy()
    }
  }, [])

  // Update colors when workouts or filter changes
  useEffect(() => {
    if (loading || !chartsReady) return
    const { combined } = computeMuscleCounts(workouts, timeFilter)
    setMuscleCounts(combined)
    const bodyState = countsToBodyState(combined)
    frontChartRef.current?.update({ bodyState })
    backChartRef.current?.update({ bodyState })
  }, [workouts, timeFilter, loading, chartsReady])

  // Get exercises for selected muscle bottom sheet
  function getExercisesForMuscle(muscleId) {
    const results = []
    workouts.forEach((w) => {
      w.exercises?.forEach((ex) => {
        const libEx = exerciseLibrary.find(
          (e) => e.name.toLowerCase() === ex.name?.toLowerCase()
        )
        if (!libEx) return
        const primaryIds = MUSCLE_ID_MAP[libEx.muscleGroup] || []
        const secondaryIds = libEx.secondaryMuscles?.flatMap(
          (s) => MUSCLE_ID_MAP[s] || []
        ) || []
        const allIds = [...primaryIds, ...secondaryIds]
        if (allIds.includes(muscleId)) {
          const date = w.createdAt?.toDate?.() || new Date(w.date)
          results.push({
            name: ex.name,
            muscleGroup: libEx.muscleGroup,
            sets: ex.sets,
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            isPrimary: primaryIds.includes(muscleId),
          })
        }
      })
    })
    return results.slice(0, 6)
  }

  // Cap at totalMuscles to avoid > 100%
  const totalMuscles = 20
  const trainedCount = Math.min(Object.keys(muscleCounts).length, totalMuscles)
  const coveragePct = Math.min(Math.round((trainedCount / totalMuscles) * 100), 100)

  const LEGEND = [
    { label: 'Light', color: '#FFE66D' },
    { label: 'Moderate', color: '#4ECDC4' },
    { label: 'Heavy', color: '#FF6B6B' },
  ]

  return (
    <div className="bodymap-root">

      {/* Header */}
      <div className="bodymap-header">
        <h1 className="bodymap-title">BODY MAP</h1>
        <p className="bodymap-sub">Tap any muscle to see details</p>
      </div>

      {/* Time Filter */}
      <div className="bodymap-filters">
        {[
          { key: 'week', label: 'THIS WEEK' },
          { key: 'month', label: 'THIS MONTH' },
          { key: 'all', label: 'ALL TIME' },
        ].map((f) => (
          <button
            key={f.key}
            className={`bm-filter-btn ${timeFilter === f.key ? 'active' : ''}`}
            onClick={() => setTimeFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Coverage Card */}
      <div className="bm-coverage-card">
        <div className="bm-coverage-top">
          <span className="bm-coverage-label">Muscle Coverage</span>
          <span className="bm-coverage-num">
            <span className="bm-coverage-trained">{trainedCount}</span>
            <span className="bm-coverage-total">/{totalMuscles}</span>
          </span>
        </div>
        <div className="bm-coverage-bar">
          <div
            className="bm-coverage-fill"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        <p className="bm-coverage-pct">
          {coveragePct}% of muscle groups trained
        </p>
      </div>

      {/* Body Charts */}
      <div className="bm-charts-wrap">
        <div className="bm-chart-col">
          <p className="bm-chart-label">FRONT</p>
          <div ref={frontRef} className="bm-chart" />
        </div>
        <div className="bm-chart-col">
          <p className="bm-chart-label">BACK</p>
          <div ref={backRef} className="bm-chart" />
        </div>
      </div>

      {/* Loading overlay on charts */}
      {loading && (
        <div className="bm-loading">
          <div className="bm-spinner" />
          <p>Loading your data...</p>
        </div>
      )}

      {/* Legend */}
      <div className="bm-legend">
        <div className="bm-legend-item">
          <div className="bm-legend-swatch" style={{ background: '#2a2a35', border: '1px solid #444' }} />
          <span>Not trained</span>
        </div>
        {LEGEND.map((l) => (
          <div className="bm-legend-item" key={l.label}>
            <div className="bm-legend-swatch" style={{ background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!loading && workouts.length === 0 && (
        <div className="bm-empty">
          <p className="bm-empty-icon">💪</p>
          <p className="bm-empty-text">No workouts logged yet</p>
          <p className="bm-empty-sub">Start training to see your muscle map!</p>
        </div>
      )}

      {/* Bottom Sheet */}
      {selectedMuscle && (
        <div
          className="bm-sheet-overlay"
          onClick={() => setSelectedMuscle(null)}
        >
          <div className="bm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bm-sheet-handle" />

            <div className="bm-sheet-header">
              <div className="bm-sheet-title-wrap">
                <h2 className="bm-sheet-name">{selectedMuscle.name}</h2>
                <p className="bm-sheet-hits">
                  {Math.round(muscleCounts[selectedMuscle.id] || 0)} times trained
                </p>
              </div>
              <div
                className="bm-sheet-intensity"
                style={{
                  background: intensityToColor(
                    Math.min(10, Math.round(
                      ((muscleCounts[selectedMuscle.id] || 0) /
                        Math.max(...Object.values(muscleCounts), 1)) * 10
                    ))
                  )
                }}
              />
              <button
                className="bm-sheet-close"
                onClick={() => setSelectedMuscle(null)}
              >✕</button>
            </div>

            {(() => {
              const exs = getExercisesForMuscle(selectedMuscle.id)
              return exs.length > 0 ? (
                <div className="bm-sheet-exercises">
                  <p className="bm-sheet-label">RECENT EXERCISES</p>
                  {exs.map((ex, i) => (
                    <div className="bm-ex-row" key={i}>
                      <div className="bm-ex-left">
                        <span className="bm-ex-name">{ex.name}</span>
                        <span className="bm-ex-date">{ex.date}</span>
                      </div>
                      <span className={`bm-ex-tag ${ex.isPrimary ? 'primary' : 'secondary'}`}>
                        {ex.isPrimary ? 'Primary' : 'Secondary'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="bm-sheet-none">
                  No exercises recorded for this muscle yet.
                </p>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}