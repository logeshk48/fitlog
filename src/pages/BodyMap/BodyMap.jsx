import { useRef, useEffect, useState, useContext } from 'react'
import { BodyChart, ViewSide } from 'body-muscles'
import { AuthContext } from '../../context/AuthContext'
import { getWorkouts } from '../../hooks/useFirestore'
import { exercises as exerciseLibrary } from '../../data/exercises'
import { MUSCLE_ID_MAP, MUSCLE_GROUPS_LIST } from '../../data/muscleMap'
import './BodyMap.css'

// ================================
// MUSCLE GROUP → BODY-MUSCLES IDS
// ================================


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
      // ✅ Use muscleGroup directly from saved Firestore data
      const primaryIds = MUSCLE_ID_MAP[ex.muscleGroup] || []
      primaryIds.forEach((id) => {
        primaryCounts[id] = (primaryCounts[id] || 0) + 1
      })

      // Secondary muscles from exercise library
      const libEx = exerciseLibrary.find(
        (e) => e.name.toLowerCase() === ex.name?.toLowerCase()
      )
      if (libEx) {
        libEx.secondaryMuscles?.forEach((sec) => {
          const secIds = MUSCLE_ID_MAP[sec] || []
          secIds.forEach((id) => {
            secondaryCounts[id] = (secondaryCounts[id] || 0) + 0.5
          })
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
  'serratus-anterior-left': 'Serratus', 'serratus-anterior-right': 'Serratus',
  'traps-upper-left': 'Traps', 'traps-upper-right': 'Traps',
  'traps-mid-left': 'Mid Traps', 'traps-mid-right': 'Mid Traps',
  'traps-lower-left': 'Lower Traps', 'traps-lower-right': 'Lower Traps',
  'lats-upper-left': 'Lats', 'lats-upper-right': 'Lats',
  'lats-mid-left': 'Mid Lats', 'lats-mid-right': 'Mid Lats',
  'lats-lower-left': 'Lower Lats', 'lats-lower-right': 'Lower Lats',
  'lower-back-erectors-left': 'Lower Back', 'lower-back-erectors-right': 'Lower Back',
  'lower-back-ql-left': 'Lower Back', 'lower-back-ql-right': 'Lower Back',
  'spine': 'Spine',
  'shoulder-front-left': 'Front Shoulder', 'shoulder-front-right': 'Front Shoulder',
  'shoulder-side-left': 'Side Shoulder', 'shoulder-side-right': 'Side Shoulder',
  'deltoid-rear-left': 'Rear Delt', 'deltoid-rear-right': 'Rear Delt',
  'biceps-left': 'Biceps', 'biceps-right': 'Biceps',
  'triceps-lateral-left': 'Triceps', 'triceps-lateral-right': 'Triceps',
  'triceps-long-left': 'Triceps', 'triceps-long-right': 'Triceps',
  'forearm-left': 'Forearms', 'forearm-right': 'Forearms',
  'forearm-extensors-left': 'Forearm Extensors', 'forearm-extensors-right': 'Forearm Extensors',
  'forearm-flexors-left': 'Forearm Flexors', 'forearm-flexors-right': 'Forearm Flexors',
  'abs-upper-left': 'Upper Abs', 'abs-upper-right': 'Upper Abs',
  'abs-lower-left': 'Lower Abs', 'abs-lower-right': 'Lower Abs',
  'obliques-left': 'Obliques', 'obliques-right': 'Obliques',
  'hip-flexor-left': 'Hip Flexors', 'hip-flexor-right': 'Hip Flexors',
  'quads-left': 'Quads', 'quads-right': 'Quads',
  'hamstrings-medial-left': 'Hamstrings', 'hamstrings-medial-right': 'Hamstrings',
  'hamstrings-lateral-left': 'Hamstrings', 'hamstrings-lateral-right': 'Hamstrings',
  'adductors-left': 'Adductors', 'adductors-right': 'Adductors',
  'tibialis-anterior-left': 'Tibialis', 'tibialis-anterior-right': 'Tibialis',
  'knee-left': 'Knee', 'knee-right': 'Knee',
  'knee-back-left': 'Knee', 'knee-back-right': 'Knee',
  'gluteus-maximus-left': 'Glutes', 'gluteus-maximus-right': 'Glutes',
  'gluteus-medius-left': 'Glute Med', 'gluteus-medius-right': 'Glute Med',
  'calves-gastroc-lateral-left': 'Calves', 'calves-gastroc-lateral-right': 'Calves',
  'calves-gastroc-medial-left': 'Calves', 'calves-gastroc-medial-right': 'Calves',
  'calves-soleus-left': 'Soleus', 'calves-soleus-right': 'Soleus',
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
        // Use muscleGroup directly from saved data
        const primaryIds = MUSCLE_ID_MAP[ex.muscleGroup] || []
        const libEx = exerciseLibrary.find(
          (e) => e.name.toLowerCase() === ex.name?.toLowerCase()
        )
        const secondaryIds = libEx?.secondaryMuscles?.flatMap(
          (s) => MUSCLE_ID_MAP[s] || []
        ) || []
        const allIds = [...primaryIds, ...secondaryIds]
        if (allIds.includes(muscleId)) {
          const date = w.createdAt?.toDate?.() || new Date(w.date)
          results.push({
            name: ex.name,
            muscleGroup: ex.muscleGroup,
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
  const totalMuscles = 11 
  const MUSCLE_GROUPS_LIST = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core', 'Legs', 'Glutes', 'Calves', 'Full Body']
  const trainedGroups = MUSCLE_GROUPS_LIST.filter((group) => {
    const ids = MUSCLE_ID_MAP[group] || []
    return ids.some((id) => muscleCounts[id] && muscleCounts[id] > 0)
  })
  const trainedCount = trainedGroups.length
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

      {/* Loading */}
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