import { createContext, useState, useContext } from 'react'

export const WorkoutContext = createContext()

export function WorkoutProvider({ children }) {
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [exercises, setExercises] = useState([])
  const [timer, setTimer] = useState(0)
  const [isResting, setIsResting] = useState(false)

  const startWorkout = (workout) => {
    setActiveWorkout(workout)
    setExercises([])
    setTimer(0)
  }

  const endWorkout = () => {
    setActiveWorkout(null)
    setExercises([])
    setTimer(0)
    setIsResting(false)
  }

  const addExercise = (exercise) => {
    setExercises(prev => [...prev, exercise])
  }

  const updateExercise = (index, updatedExercise) => {
    setExercises(prev => prev.map((ex, i) =>
      i === index ? updatedExercise : ex
    ))
  }

  return (
    <WorkoutContext.Provider value={{
      activeWorkout,
      exercises,
      timer,
      isResting,
      setIsResting,
      setTimer,
      startWorkout,
      endWorkout,
      addExercise,
      updateExercise,
    }}>
      {children}
    </WorkoutContext.Provider>
  )
}

export function useWorkout() {
  return useContext(WorkoutContext)
}