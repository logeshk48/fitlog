export default function WorkoutSummary({ onDone }) {
  return (
    <div className="page">
      <h1>Workout Complete! 🎉</h1>
      <button onClick={onDone}>Done</button>
    </div>
  )
}