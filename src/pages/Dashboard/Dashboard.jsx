import { useState, useEffect, useContext, useRef } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { BodyChart, ViewSide } from 'body-muscles'
import './Dashboard.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Push yourself because no one else is going to do it for you.",
  "Sweat is just fat crying.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up. Work out. Look hot. Kick ass.",
  "Train insane or remain the same.",
  "Believe in yourself and all that you are.",
  "No pain, no gain. Shut up and train.",
  "Be stronger than your excuses.",
  "Results happen over time, not overnight.",
]

const getDailyQuote = () => {
  const day = new Date().getDay()
  return QUOTES[day % QUOTES.length]
}

function useCounter(target, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return count
}

function StatsGrid({ stats }) {
  const totalCount = useCounter(stats.total)
  const liftCount = useCounter(stats.bestLift)
  const volumeCount = useCounter(stats.weekVolume)

  return (
    <div className="stats-grid animate-5">
      <div className="stat-box">
        <span className="stat-box-value">{totalCount}</span>
        <span className="stat-box-label">Workouts</span>
      </div>
      <div className="stat-box">
        <span className="stat-box-value">{liftCount}kg</span>
        <span className="stat-box-label">Best Lift</span>
      </div>
      <div className="stat-box">
        <span className="stat-box-value">{volumeCount}kg</span>
        <span className="stat-box-label">Week Volume</span>
      </div>
    </div>
  )
}

// Muscle mapping for body map card
const EXERCISE_MUSCLE_MAP = {
  'bench press': ['chest-upper-left', 'chest-upper-right', 'chest-lower-left', 'chest-lower-right'],
  'chest press': ['chest-upper-left', 'chest-upper-right'],
  'push up': ['chest-upper-left', 'chest-upper-right', 'triceps-left', 'triceps-right'],
  'chest fly': ['chest-upper-left', 'chest-upper-right', 'chest-lower-left', 'chest-lower-right'],
  'incline press': ['chest-upper-left', 'chest-upper-right'],
  'decline press': ['chest-lower-left', 'chest-lower-right'],
  'pull up': ['latissimus-dorsi-left', 'latissimus-dorsi-right', 'biceps-left', 'biceps-right'],
  'lat pulldown': ['latissimus-dorsi-left', 'latissimus-dorsi-right'],
  'row': ['latissimus-dorsi-left', 'latissimus-dorsi-right', 'trapezius-middle-left', 'trapezius-middle-right'],
  'deadlift': ['latissimus-dorsi-left', 'latissimus-dorsi-right', 'gluteus-maximus-left', 'gluteus-maximus-right', 'hamstrings-left', 'hamstrings-right'],
  'shoulder press': ['deltoid-anterior-left', 'deltoid-anterior-right', 'deltoid-lateral-left', 'deltoid-lateral-right'],
  'lateral raise': ['deltoid-lateral-left', 'deltoid-lateral-right'],
  'overhead press': ['deltoid-anterior-left', 'deltoid-anterior-right', 'triceps-left', 'triceps-right'],
  'curl': ['biceps-left', 'biceps-right'],
  'bicep curl': ['biceps-left', 'biceps-right'],
  'hammer curl': ['biceps-left', 'biceps-right', 'brachioradialis-left', 'brachioradialis-right'],
  'tricep': ['triceps-left', 'triceps-right'],
  'triceps': ['triceps-left', 'triceps-right'],
  'dip': ['triceps-left', 'triceps-right', 'chest-lower-left', 'chest-lower-right'],
  'squat': ['quadriceps-left', 'quadriceps-right', 'gluteus-maximus-left', 'gluteus-maximus-right'],
  'leg press': ['quadriceps-left', 'quadriceps-right', 'gluteus-maximus-left', 'gluteus-maximus-right'],
  'lunge': ['quadriceps-left', 'quadriceps-right', 'gluteus-maximus-left', 'gluteus-maximus-right'],
  'leg extension': ['quadriceps-left', 'quadriceps-right'],
  'leg curl': ['hamstrings-left', 'hamstrings-right'],
  'calf raise': ['gastrocnemius-left', 'gastrocnemius-right'],
  'hip thrust': ['gluteus-maximus-left', 'gluteus-maximus-right'],
  'glute bridge': ['gluteus-maximus-left', 'gluteus-maximus-right'],
  'crunch': ['rectus-abdominis-upper', 'rectus-abdominis-lower'],
  'plank': ['rectus-abdominis-upper', 'rectus-abdominis-lower', 'obliques-left', 'obliques-right'],
  'sit up': ['rectus-abdominis-upper', 'rectus-abdominis-lower'],
  'shrug': ['trapezius-upper-left', 'trapezius-upper-right'],
}

const TYPE_MUSCLE_MAP = {
  strength: ['chest-upper-left', 'chest-upper-right', 'biceps-left', 'biceps-right', 'triceps-left', 'triceps-right'],
  cardio: ['quadriceps-left', 'quadriceps-right', 'hamstrings-left', 'hamstrings-right', 'gastrocnemius-left', 'gastrocnemius-right'],
  flexibility: ['hamstrings-left', 'hamstrings-right', 'obliques-left', 'obliques-right'],
  sports: ['quadriceps-left', 'quadriceps-right', 'deltoid-lateral-left', 'deltoid-lateral-right'],
}

function getWeekMuscleCounts(workouts) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const filtered = workouts.filter((w) => {
    const d = w.createdAt?.toDate?.() || new Date(w.date)
    return d >= oneWeekAgo
  })
  const counts = {}
  filtered.forEach((w) => {
    const musclesHit = new Set()
    if (w.exercises?.length) {
      w.exercises.forEach((ex) => {
        const name = ex.name?.toLowerCase() || ''
        Object.entries(EXERCISE_MUSCLE_MAP).forEach(([key, muscles]) => {
          if (name.includes(key)) muscles.forEach((m) => musclesHit.add(m))
        })
      })
    }
    if (musclesHit.size === 0 && w.type) {
      const defaults = TYPE_MUSCLE_MAP[w.type] || []
      defaults.forEach((m) => musclesHit.add(m))
    }
    musclesHit.forEach((m) => { counts[m] = (counts[m] || 0) + 1 })
  })
  return counts
}

function MiniBodyMap({ workouts }) {
  const frontRef = useRef(null)
  const backRef = useRef(null)
  const frontChartRef = useRef(null)
  const backChartRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!frontRef.current || !backRef.current) return

    frontChartRef.current = new BodyChart(frontRef.current, {
      view: ViewSide.FRONT,
      bodyState: {},
      showViewLabel: false,
      enableTransitions: true,
    })

    backChartRef.current = new BodyChart(backRef.current, {
      view: ViewSide.BACK,
      bodyState: {},
      showViewLabel: false,
      enableTransitions: true,
    })

    return () => {
      frontChartRef.current?.destroy()
      backChartRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (!workouts.length) return
    const counts = getWeekMuscleCounts(workouts)
    const max = Math.max(...Object.values(counts), 1)
    const bodyState = {}
    Object.entries(counts).forEach(([id, count]) => {
      bodyState[id] = {
        intensity: Math.min(10, Math.round((count / max) * 10)),
        selected: false,
      }
    })
    frontChartRef.current?.update({ bodyState })
    backChartRef.current?.update({ bodyState })
  }, [workouts])

  const counts = getWeekMuscleCounts(workouts)
  const trained = Object.keys(counts).length
  const total = 20

  return (
    <div className="mini-bodymap-card animate-7" onClick={() => navigate('/bodymap')}>
      <div className="mini-bodymap-header">
        <div>
          <h3 className="mini-bodymap-title">Muscle Coverage</h3>
          <p className="mini-bodymap-sub">This week · Tap to explore</p>
        </div>
        <span className="mini-bodymap-count">
          {trained}/{total}
        </span>
      </div>

      <div className="mini-bodymap-charts">
        <div ref={frontRef} className="mini-bodymap-svg" />
        <div ref={backRef} className="mini-bodymap-svg" />
      </div>

      <div className="mini-bodymap-bar-wrap">
        <div className="mini-bodymap-bar">
          <div
            className="mini-bodymap-fill"
            style={{ width: `${Math.round((trained / total) * 100)}%` }}
          />
        </div>
        <span className="mini-bodymap-pct">
          {Math.round((trained / total) * 100)}% covered
        </span>
      </div>
    </div>
  )
}

function Dashboard() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [activePlan, setActivePlan] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [weekWorkouts, setWeekWorkouts] = useState([])
  const [profileComplete, setProfileComplete] = useState(true)
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

      const profileRef = doc(db, 'profiles', user.uid)
      const profileSnap = await getDoc(profileRef)
      if (profileSnap.exists()) {
        const p = profileSnap.data()
        setProfileComplete(!!(p.height && p.weight && p.age))
      } else {
        setProfileComplete(false)
      }

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
        <div className="greeting-top">
          <div>
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
          <div className="avatar-wrap">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">
                {getFirstName()[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="daily-quote">
          <p>"{getDailyQuote()}"</p>
        </div>
      </div>

      {/* ===== PROFILE ALERT ===== */}
      {!profileComplete && (
        <div
          className="profile-alert"
          onClick={() => navigate('/profile')}
        >
          <span className="profile-alert-icon">⚠️</span>
          <div className="profile-alert-text">
            <h4>Complete Your Profile</h4>
            <p>Add height, weight & goals for better insights!</p>
          </div>
          <span className="profile-alert-arrow">›</span>
        </div>
      )}

      {/* ===== STREAK CARD ===== */}
      <div className="streak-card animate-2">
        <div className="streak-left">
          <div className="streak-fire">
            {streak === 0 ? '💤' :
             streak < 3 ? '🔥' :
             streak < 7 ? '🔥🔥' : '🔥🔥🔥'}
          </div>
          <div>
            <h2 className="streak-number">{streak} Days</h2>
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
      <StatsGrid stats={stats} />

      {/* ===== SMART INSIGHT ===== */}
      <div className="insight-card animate-6">
        <span className="insight-icon">💡</span>
        <p className="insight-text">{getInsight()}</p>
      </div>

      {/* ===== MINI BODY MAP ===== */}
      <MiniBodyMap workouts={workouts} />

    </div>
  )
}

export default Dashboard