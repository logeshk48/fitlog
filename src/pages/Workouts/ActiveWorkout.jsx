export default function ActiveWorkout({ onBack }) {
  return (
    <div className="page">
      <button onClick={onBack}>← Back</button>
      <h1>Active Workout</h1>
    </div>
  )
}