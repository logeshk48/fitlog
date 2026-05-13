import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function Dashboard() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [activePlan, setActivePlan] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [weekWorkouts, setWeekWorkouts] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    bestLift: 0,
    weekVolume: 0,
    topMuscle: ''
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const planQ = query(
        collection(db, 'plans'),
        where('userId', '==', user.uid),
        where('isActive', '==', true)
      )
      const planSnap = await getDocs(planQ)
      if (!planSnap.empty) {
        setActivePlan({ id: planSnap.docs[0].id, ...planSnap.docs[0].data() })
      }

      const workoutQ = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const workoutSnap = await getDocs(workoutQ)
      const allWorkouts = workoutSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setWorkouts(allWorkouts)

      calculateStreak(allWorkouts)
      calculateWeekWorkouts(allWorkouts)
      calculateStats(allWorkouts)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const calculateStreak = (allWorkouts) => {
    if (allWorkouts.length === 0) return
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toDateString()
      const hasWorkout = allWorkouts.some(w => {
        const wDate = w.createdAt?.toDate?.() || new Date(w.date)
        return wDate.toDateString() === dateStr
      })
      if (hasWorkout) { streak++ }
      else if (i > 0) { break }
    }
    setStreak(streak)
  }

  const calculateWeekWorkouts = (allWorkouts) => {
    const week = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monday = new Date(today)
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    monday.setDate(today.getDate() + diff)
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toDateString()
      const hasWorkout = allWorkouts.some(w => {
        const wDate = w.createdAt?.toDate?.() || new Date(w.date)
        return wDate.toDateString() === dateStr
      })
      week.push(hasWorkout)
    }
    setWeekWorkouts(week)
  }

  const calculateStats = (allWorkouts) => {
    const total = allWorkouts.length
    let bestLift = 0
    let weekVolume = 0
    const muscleCounts = {}
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    allWorkouts.forEach(workout => {
      const wDate = workout.createdAt?.toDate?.() || new Date(workout.date)
      const isThisWeek = wDate > oneWeekAgo
      workout.exercises?.forEach(ex => {
        if (ex.muscleGroup) {
          muscleCounts[ex.muscleGroup] = (muscleCounts[ex.muscleGroup] || 0) + 1
        }
        ex.sets?.forEach(set => {
          if (set.weight > bestLift) bestLift = set.weight
          if (isThisWeek) weekVolume += (set.weight || 0) * (set.reps || 0)
        })
      })
    })
    const topMuscle = Object.entries(muscleCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    setStats({ total, bestLift, weekVolume: Math.round(weekVolume), topMuscle })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getFirstName = () => user?.displayName?.split(' ')[0] || 'Champ'

  const getTodayFocus = () => {
    if (!activePlan) return null
    const dayIndex = new Date().getDay()
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1
    const today = FULL_DAYS[adjustedIndex]
    return activePlan.schedule?.[today] || null
  }

  const getInsight = () => {
    if (stats.topMuscle) return `You train ${stats.topMuscle} the most! Keep pushing! 💪`
    if (streak > 3) return `${streak} day streak! You're on fire! 🔥`
    if (stats.total === 0) return "Start your first workout today! 🚀"
    return "Consistency is the key to progress! 💪"
  }

  const todayFocus = getTodayFocus()
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-pulse">💪</div>
        <p>Loading your stats...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">

      {/* ===== GREETING ===== */}
      <div className="greeting-section animate-1">
        <p className="greeting-time">{getGreeting()}</p>
        <h1 className="greeting-name">{getFirstName()} 👋</h1>
        <p className="greeting-date">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* ===== STREAK CARD ===== */}
      <div className="streak-card animate-2">
        <div className="streak-left">
          <div className="streak-fire">{streak > 0 ? '🔥' : '💤'}</div>
          <div>
            <h2 className="streak-number">{streak} Day{streak !== 1 ? 's' : ''}</h2>
            <p className="streak-label">
              {streak === 0 ? 'Start your streak!' :
               streak < 3 ? 'Getting started!' :
               streak < 7 ? 'On a roll!' :
               streak < 14 ? 'Unstoppable!' : 'Legendary! 🏆'}
            </p>
          </div>
        </div>
        <div className="streak-bar-wrap">
          <div className="streak-bar">
            <div
              className="streak-fill"
              style={{ width: `${Math.min((streak / 7) * 100, 100)}%` }}
            />
          </div>
          <p className="streak-goal">{streak}/7 days</p>
        </div>
      </div>

      {/* ===== TODAY'S FOCUS ===== */}
      <div className="today-card animate-3">
        <div className="today-card-header">
          <h3 className="today-title">Today's Focus</h3>
          {activePlan && (
            <span className="plan-name-tag">{activePlan.name}</span>
          )}
        </div>

        {!activePlan ? (
          <div className="no-plan">
            <p>No active plan set</p>
            <button
              className="create-plan-btn"
              onClick={() => navigate('/plans')}
            >
              Create Plan →
            </button>
          </div>
        ) : todayFocus?.isRest ? (
          <div className="rest-day">
            <span className="rest-emoji">😴</span>
            <div>
              <h3>Rest Day</h3>
              <p>Recovery is part of the process!</p>
            </div>
          </div>
        ) : (
          <div className="focus-content">
            <div className="focus-muscles">
              {todayFocus?.primary && (
                <div className="focus-primary-card">
                  <span className="focus-muscle-label">Primary</span>
                  <span className="focus-muscle-name">{todayFocus.primary}</span>
                </div>
              )}
              {todayFocus?.secondary?.length > 0 && (
                <div className="focus-secondary-card">
                  <span className="focus-muscle-label">Secondary</span>
                  <span className="focus-muscle-name">
                    {todayFocus.secondary.join(' · ')}
                  </span>
                </div>
              )}
              {!todayFocus?.primary && (
                <p className="not-set">Not set for today</p>
              )}
            </div>
            <button
              className="start-workout-btn"
              onClick={() => navigate('/workouts', {
                state: {
                  preselectedMuscle: todayFocus?.primary,
                  preselectedSecondary: todayFocus?.secondary || [],
                  preselectedEquipment: 'With Weight'
                }
              })}
            >
              Start Workout →
            </button>
          </div>
        )}
      </div>

      {/* ===== THIS WEEK ===== */}
      <div className="week-card animate-4">
        <h3 className="section-title">This Week</h3>
        <div className="week-dots">
          {DAYS.map((day, i) => (
            <div key={day} className={`week-day ${i === todayIndex ? 'today' : ''}`}>
              <div className={`week-dot ${weekWorkouts[i] ? 'done' : ''} ${i === todayIndex ? 'today' : ''}`} />
              <span className="week-day-label">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== QUICK STATS ===== */}
      <div className="stats-grid animate-5">
        <div className="stat-box">
          <span className="stat-box-value">{stats.total}</span>
          <span className="stat-box-label">Workouts</span>
        </div>
        <div className="stat-box">
          <span className="stat-box-value">{stats.bestLift}kg</span>
          <span className="stat-box-label">Best Lift</span>
        </div>
        <div className="stat-box">
          <span className="stat-box-value">{stats.weekVolume}kg</span>
          <span className="stat-box-label">Week Volume</span>
        </div>
      </div>

      {/* ===== SMART INSIGHT ===== */}
      <div className="insight-card animate-6">
        <span className="insight-icon">💡</span>
        <p className="insight-text">{getInsight()}</p>
      </div>

    </div>
  )
}

export default Dashboard