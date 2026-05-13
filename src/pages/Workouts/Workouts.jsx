import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { exercises, muscleGroups, equipmentTypes } from '../../data/exercises'
import ActiveWorkout from './ActiveWorkout'
import WorkoutSummary from './WorkoutSummary'
import './Workouts.css'

function Workouts() {
  const location = useLocation()
  const preselected = location.state

  const [screen, setScreen] = useState('select')
  const [selectedEquipment, setSelectedEquipment] = useState(
    preselected?.preselectedEquipment || 'With Weight'
  )
  const [selectedMuscle, setSelectedMuscle] = useState(
    preselected?.preselectedMuscle || 'Chest'
  )
  const [workoutExercises, setWorkoutExercises] = useState([])
  const [completedWorkout, setCompletedWorkout] = useState(null)

  const filteredExercises = exercises.filter(
    ex =>
      ex.muscleGroup === selectedMuscle &&
      ex.equipmentType === selectedEquipment
  )

  const addExercise = (exercise) => {
    const already = workoutExercises.find(e => e.name === exercise.name)
    if (already) return
    setWorkoutExercises(prev => [...prev, {
      ...exercise,
      sets: [{ reps: '', weight: '', done: false, note: '' }]
    }])
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

  if (screen === 'active') {
    return (
      <ActiveWorkout
        exercises={workoutExercises}
        onFinish={finishWorkout}
        onBack={() => setScreen('select')}
      />
    )
  }

  if (screen === 'summary') {
    return (
      <WorkoutSummary
        workout={completedWorkout}
        onDone={resetWorkout}
      />
    )
  }

  return (
    <div className="workouts-page">

      {/* Header */}
      <div className="workouts-header">
        <h1>Build Workout</h1>
        <p className="workouts-date">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Equipment Toggle */}
      <div className="equipment-toggle">
        {equipmentTypes.map(type => (
          <button
            key={type}
            className={`equipment-btn ${selectedEquipment === type ? 'active' : ''}`}
            onClick={() => setSelectedEquipment(type)}
          >
            {type === 'With Weight' ? 'With Weight' : 'Without Weight'}
          </button>
        ))}
      </div>

      {/* Muscle Group Selector */}
      <div className="muscle-section">
        <h3 className="section-title">Muscle Group</h3>
        <div className="muscle-grid">
          {muscleGroups.map(muscle => (
            <button
              key={muscle}
              className={`muscle-btn ${selectedMuscle === muscle ? 'active' : ''}`}
              onClick={() => setSelectedMuscle(muscle)}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise List */}
      <div className="exercise-section">
        <h3 className="section-title">
          Exercises
          <span className="exercise-count">{filteredExercises.length}</span>
        </h3>

        {/* Preselected banner */}
        {preselected?.preselectedMuscle && (
          <div className="preselected-banner">
            ⚡ Auto-selected from your plan: <strong>{preselected.preselectedMuscle}</strong>
          </div>
        )}

        <div className="exercise-list">
          {filteredExercises.map(exercise => {
            const added = workoutExercises.find(e => e.name === exercise.name)
            return (
              <div key={exercise.name} className={`exercise-card ${added ? 'added' : ''}`}>
                <div className="exercise-info">
                  <h4>{exercise.name}</h4>
                  <div className="exercise-tags">
                    <span className={`difficulty-badge ${exercise.difficulty.toLowerCase()}`}>
                      {exercise.difficulty}
                    </span>
                    {exercise.secondaryMuscles.slice(0, 2).map(m => (
                      <span key={m} className="secondary-badge">{m}</span>
                    ))}
                  </div>
                </div>
                <button
                  className={`add-btn ${added ? 'added' : ''}`}
                  onClick={() => added ? removeExercise(exercise.name) : addExercise(exercise)}
                >
                  {added ? '✓' : '+'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Start Workout Button */}
      {workoutExercises.length > 0 && (
        <div className="start-workout-bar">
          <div className="selected-count">
            {workoutExercises.length} exercise{workoutExercises.length > 1 ? 's' : ''} selected
          </div>
          <button className="start-btn" onClick={startWorkout}>
            Start Workout →
          </button>
        </div>
      )}

    </div>
  )
}

export default Workouts