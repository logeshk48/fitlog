import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Zap, Target, Flame, Activity, Wind, Circle, ChevronRight } from 'lucide-react'
import { exercises, muscleGroups, equipmentTypes } from '../../data/exercises'
import ActiveWorkout from './ActiveWorkout'
import WorkoutSummary from './WorkoutSummary'
import './Workouts.css'

const MUSCLE_COLORS = {
  'Chest':     { color: '#FF6B6B', bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)' },
  'Back':      { color: '#4ECDC4', bg: 'rgba(78,205,196,0.08)',  border: 'rgba(78,205,196,0.2)' },
  'Shoulders': { color: '#A855F7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
  'Biceps':    { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  'Triceps':   { color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  'Forearms':  { color: '#FFE66D', bg: 'rgba(255,230,109,0.08)', border: 'rgba(255,230,109,0.2)' },
  'Core':      { color: '#22C55E', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)' },
  'Legs':      { color: '#EC4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  'Glutes':    { color: '#FF8E53', bg: 'rgba(255,142,83,0.08)', border: 'rgba(255,142,83,0.2)' },
  'Calves':    { color: '#4d9fff', bg: 'rgba(77,159,255,0.08)', border: 'rgba(77,159,255,0.2)' },
  'Full Body': { color: '#FFE66D', bg: 'rgba(255,230,109,0.08)', border: 'rgba(255,230,109,0.2)' },
}

const MUSCLE_ICONS = {
  'Chest':     <Flame size={13} />,
  'Back':      <Activity size={13} />,
  'Shoulders': <Target size={13} />,
  'Biceps':    <Dumbbell size={13} />,
  'Triceps':   <Dumbbell size={13} />,
  'Forearms':  <Zap size={13} />,
  'Core':      <Circle size={13} />,
  'Legs':      <Zap size={13} />,
  'Glutes':    <Flame size={13} />,
  'Calves':    <Activity size={13} />,
  'Full Body': <Target size={13} />,
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }
})

function Workouts() {
  const location = useLocation()
  const preselected = location.state

  const getPreselectedExercises = () => {
    if (!preselected?.preselectedMuscle) return []
    const primaryExercises = exercises
      .filter(ex =>
        ex.muscleGroup === preselected.preselectedMuscle &&
        ex.equipmentType === (preselected.preselectedEquipment || 'With Weight')
      )
      .map(ex => ({ ...ex, sets: [{ reps: 10, weight: 0, done: false }] }))

    const secondaryExercises = (preselected.preselectedSecondary || [])
      .flatMap(muscle =>
        exercises
          .filter(ex =>
            ex.muscleGroup === muscle &&
            ex.equipmentType === (preselected.preselectedEquipment || 'With Weight')
          )
          .slice(0, 2)
          .map(ex => ({ ...ex, sets: [{ reps: 10, weight: 0, done: false }] }))
      )
    return [...primaryExercises, ...secondaryExercises]
  }

  const [screen, setScreen] = useState('select')
  const [selectedEquipment, setSelectedEquipment] = useState(preselected?.preselectedEquipment || 'With Weight')
  const [selectedMuscle, setSelectedMuscle] = useState(preselected?.preselectedMuscle || 'Chest')
  const [workoutExercises, setWorkoutExercises] = useState(() => getPreselectedExercises())
  const [completedWorkout, setCompletedWorkout] = useState(null)

  const filteredExercises = exercises.filter(
    ex => ex.muscleGroup === selectedMuscle && ex.equipmentType === selectedEquipment
  )

  const addExercise = (exercise) => {
    if (workoutExercises.find(e => e.name === exercise.name)) return
    setWorkoutExercises(prev => [...prev, { ...exercise, sets: [{ reps: 10, weight: 0, done: false }] }])
  }

  const removeExercise = (name) => {
    setWorkoutExercises(prev => prev.filter(e => e.name !== name))
  }

  const startWorkout = () => {
    if (workoutExercises.length === 0) return
    setScreen('active')
  }

  const finishWorkout = (summary) => {
    setCompletedWorkout(summary)
    setScreen('summary')
  }

  const resetWorkout = () => {
    setWorkoutExercises([])
    setCompletedWorkout(null)
    setScreen('select')
  }

  if (screen === 'active') return <ActiveWorkout exercises={workoutExercises} onFinish={finishWorkout} onBack={() => setScreen('select')} />
  if (screen === 'summary') return <WorkoutSummary workout={completedWorkout} onDone={resetWorkout} />

  const muscleTheme = MUSCLE_COLORS[selectedMuscle] || MUSCLE_COLORS['Chest']

  return (
    <div className="workouts-page">

      {/* Header */}
      <motion.div className="wo-header" {...fadeUp(0)}>
        <div>
          <h1 className="wo-title">BUILD WORKOUT</h1>
          <p className="wo-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </motion.div>

      {/* Equipment Toggle */}
      <motion.div className="wo-equipment" {...fadeUp(0.05)}>
        {equipmentTypes.map(type => (
          <motion.button
            key={type}
            className={`wo-eq-btn ${selectedEquipment === type ? 'active' : ''}`}
            onClick={() => setSelectedEquipment(type)}
            whileTap={{ scale: 0.96 }}
          >
            <Dumbbell size={15} />
            <span>{type}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Muscle Group */}
      <motion.div className="wo-muscle-section" {...fadeUp(0.1)}>
        <p className="wo-section-label">MUSCLE GROUP</p>
        <div className="wo-muscle-grid">
          {muscleGroups.map((muscle, i) => {
            const theme = MUSCLE_COLORS[muscle]
            const isActive = selectedMuscle === muscle
            return (
              <motion.button
                key={muscle}
                className={`wo-muscle-btn ${isActive ? 'active' : ''}`}
                style={isActive ? {
                  '--mc': theme.color,
                  '--mb': theme.bg,
                  '--mbd': theme.border,
                  background: theme.bg,
                  borderColor: theme.color,
                  color: theme.color,
                  boxShadow: `0 4px 16px ${theme.bg}`
                } : {}}
                onClick={() => setSelectedMuscle(muscle)}
                whileTap={{ scale: 0.93 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <span className="wo-muscle-icon" style={isActive ? { color: theme.color } : {}}>
                  {MUSCLE_ICONS[muscle]}
                </span>
                {muscle}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Exercise List */}
      <motion.div className="wo-exercise-section" {...fadeUp(0.15)}>
        <div className="wo-section-header">
          <p className="wo-section-label">EXERCISES</p>
          <span className="wo-ex-count" style={{ color: muscleTheme.color }}>
            {filteredExercises.length}
          </span>
        </div>

        {preselected?.preselectedMuscle && (
          <motion.div
            className="wo-banner"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Zap size={13} color="#4ECDC4" />
            <span>
              Auto-selected from plan: <strong>{preselected.preselectedMuscle}</strong>
              {preselected.preselectedSecondary?.length > 0 && ` + ${preselected.preselectedSecondary.join(', ')}`}
            </span>
          </motion.div>
        )}

        <div className="wo-exercise-list">
          <AnimatePresence>
            {filteredExercises.map((exercise, i) => {
              const added = !!workoutExercises.find(e => e.name === exercise.name)
              return (
                <motion.div
                  key={exercise.name}
                  className={`wo-ex-card ${added ? 'added' : ''}`}
                  style={added ? {
                    borderColor: muscleTheme.border,
                    background: muscleTheme.bg,
                  } : {}}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="wo-ex-info">
                    <h4 className="wo-ex-name">{exercise.name}</h4>
                    <div className="wo-ex-tags">
                      <span className={`wo-difficulty ${exercise.difficulty.toLowerCase()}`}>
                        {exercise.difficulty}
                      </span>
                      {exercise.secondaryMuscles.slice(0, 2).map(m => (
                        <span key={m} className="wo-secondary-tag">{m}</span>
                      ))}
                    </div>
                  </div>
                  <motion.button
                    className={`wo-add-btn ${added ? 'added' : ''}`}
                    style={added ? { background: `linear-gradient(135deg, ${muscleTheme.color}, ${muscleTheme.color}99)` } : {}}
                    onClick={() => added ? removeExercise(exercise.name) : addExercise(exercise)}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <motion.span
                      key={added ? 'check' : 'plus'}
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {added ? '✓' : '+'}
                    </motion.span>
                  </motion.button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Start Workout Bar */}
      <AnimatePresence>
        {workoutExercises.length > 0 && (
          <motion.div
            className="wo-start-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="wo-start-left">
              <span className="wo-start-count">{workoutExercises.length}</span>
              <span className="wo-start-label">
                exercise{workoutExercises.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <motion.button
              className="wo-start-btn"
              onClick={startWorkout}
              whileHover={{ scale: 1.03, boxShadow: '0 12px 32px rgba(255,107,107,0.6)' }}
              whileTap={{ scale: 0.97 }}
            >
              START WORKOUT
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default Workouts