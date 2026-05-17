import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MUSCLE_ID_MAP, MUSCLE_GROUPS_LIST } from '../../data/muscleMap'
import bodymapBg from '../../assets/bodymap-bg.png'
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

const getDailyQuote = () => QUOTES[new Date().getDay() % QUOTES.length]

function useCounter(target, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return count
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }
})

function BodyMapCard({ workouts }) {
  const navigate = useNavigate()
  const counts = {}
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  workouts
    .filter(w => (w.createdAt?.toDate?.() || new Date(w.date)) >= oneWeekAgo)
    .forEach(w => {
      w.exercises?.forEach(ex => {
        const ids = MUSCLE_ID_MAP[ex.muscleGroup] || []
        ids.forEach(id => { counts[id] = (counts[id] || 0) + 1 })
      })
    })

  const trained = MUSCLE_GROUPS_LIST.filter(g => {
    const ids = MUSCLE_ID_MAP[g] || []
    return ids.some(id => counts[id] > 0)
  }).length
  const pct = Math.round((trained / 11) * 100)

  return (
    <motion.div
      className="bmc-wrap"
      {...fadeUp(0.05)}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate('/bodymap')}
    >
      <div className="bmc-bg" style={{ backgroundImage: `url(${bodymapBg})` }} />
      <div className="bmc-overlay" />
      <div className="bmc-content">
        <div className="bmc-row">
          <div>
            <p className="bmc-title">MUSCLE COVERAGE</p>
            <p className="bmc-sub">This week · Tap to explore</p>
          </div>
          <div className="bmc-count">
            <span className="bmc-num">{trained}</span>
            <span className="bmc-den">/11</span>
          </div>
        </div>
        <div className="bmc-bar-track">
          <motion.div
            className="bmc-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, delay: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="bmc-footer">
          <span className="bmc-pct">{pct}% trained</span>
          <span className="bmc-cta">EXPLORE →</span>
        </div>
      </div>
    </motion.div>
  )
}

function StatsGrid({ stats }) {
  const totalCount = useCounter(stats.total)
  const liftCount = useCounter(stats.bestLift)
  const volumeCount = useCounter(stats.weekVolume)

  const items = [
    { value: totalCount, label: 'WORKOUTS', color: '#FF6B6B', shadow: 'rgba(255,107,107,0.35)' },
    { value: `${liftCount}kg`, label: 'BEST LIFT', color: '#4ECDC4', shadow: 'rgba(78,205,196,0.35)' },
    { value: `${volumeCount}kg`, label: 'WEEK VOL', color: '#A855F7', shadow: 'rgba(168,85,247,0.35)' },
  ]

  return (
    <motion.div className="stats-grid" {...fadeUp(0.35)}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          className="stat-box"
          style={{ '--c': item.color, '--s': item.shadow }}
          whileHover={{ y: -5, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <span className="stat-val">{item.value}</span>
          <span className="stat-lbl">{item.label}</span>
        </motion.div>
      ))}
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [activePlan, setActivePlan] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [weekWorkouts, setWeekWorkouts] = useState([])
  const [profileComplete, setProfileComplete] = useState(true)
  const [stats, setStats] = useState({ total: 0, bestLift: 0, weekVolume: 0, topMuscle: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const planSnap = await getDocs(query(collection(db, 'plans'), where('userId', '==', user.uid), where('isActive', '==', true)))
      if (!planSnap.empty) setActivePlan({ id: planSnap.docs[0].id, ...planSnap.docs[0].data() })

      const workoutSnap = await getDocs(query(collection(db, 'workouts'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')))
      const all = workoutSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setWorkouts(all)
      calcStreak(all)
      calcWeek(all)
      calcStats(all)

      const pSnap = await getDoc(doc(db, 'profiles', user.uid))
      if (pSnap.exists()) {
        const p = pSnap.data()
        setProfileComplete(!!(p.height && p.weight && p.age))
      } else setProfileComplete(false)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const calcStreak = (all) => {
    let s = 0
    const today = new Date(); today.setHours(0,0,0,0)
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      const has = all.some(w => (w.createdAt?.toDate?.() || new Date(w.date)).toDateString() === d.toDateString())
      if (has) s++
      else if (i > 0) break
    }
    setStreak(s)
  }

  const calcWeek = (all) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const mon = new Date(today)
    mon.setDate(today.getDate() + (today.getDay() === 0 ? -6 : 1 - today.getDay()))
    setWeekWorkouts(Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i)
      return all.some(w => (w.createdAt?.toDate?.() || new Date(w.date)).toDateString() === d.toDateString())
    }))
  }

  const calcStats = (all) => {
    let bestLift = 0, weekVolume = 0
    const mc = {}
    const ago = new Date(); ago.setDate(ago.getDate() - 7)
    all.forEach(w => {
      const wd = w.createdAt?.toDate?.() || new Date(w.date)
      w.exercises?.forEach(ex => {
        if (ex.muscleGroup) mc[ex.muscleGroup] = (mc[ex.muscleGroup] || 0) + 1
        ex.sets?.forEach(s => {
          if (s.weight > bestLift) bestLift = s.weight
          if (wd > ago) weekVolume += (s.weight || 0) * (s.reps || 0)
        })
      })
    })
    const topMuscle = Object.entries(mc).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    setStats({ total: all.length, bestLift, weekVolume: Math.round(weekVolume), topMuscle })
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
  }

  const getName = () => user?.displayName?.split(' ')[0] || 'Champ'

  const getTodayFocus = () => {
    if (!activePlan) return null
    const di = new Date().getDay()
    return activePlan.schedule?.[FULL_DAYS[di === 0 ? 6 : di - 1]] || null
  }

  const getInsight = () => {
    if (stats.topMuscle) return `You train ${stats.topMuscle} the most — keep pushing!`
    if (streak > 3) return `${streak} day streak — you're unstoppable!`
    if (stats.total === 0) return 'Log your first workout and start your journey!'
    return 'Consistency beats intensity — show up every day!'
  }

  const todayFocus = getTodayFocus()
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  if (loading) {
    return (
      <div className="dash-loading">
        <motion.div
          className="dash-loading-logo"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >F</motion.div>
        <p>Loading your stats...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">

      {/* ===== GREETING ===== */}
      <motion.div className="greeting" {...fadeUp(0)}>
        <p className="greeting-time">{getGreeting()}</p>
        <h1 className="greeting-name">
          {getName().split('').map((char, i) => (
            <motion.span
              key={i}
              className="greeting-char"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04, duration: 0.4 }}
            >
              {char}
            </motion.span>
          ))}
        </h1>
        <p className="greeting-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        <motion.div
          className="quote-box"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="quote-accent" />
          <p className="quote-text">"{getDailyQuote()}"</p>
        </motion.div>
      </motion.div>

      {/* ===== PROFILE ALERT ===== */}
      <AnimatePresence>
        {!profileComplete && (
          <motion.div
            className="profile-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => navigate('/profile')}
            whileTap={{ scale: 0.98 }}
          >
            <span>⚠️</span>
            <div>
              <h4>Complete Your Profile</h4>
              <p>Add height, weight & goals for better insights!</p>
            </div>
            <span className="alert-arrow">›</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BODY MAP CARD ===== */}
      <BodyMapCard workouts={workouts} />

      {/* ===== STREAK ===== */}
      <motion.div className="streak-card" {...fadeUp(0.15)} whileHover={{ y: -3 }}>
        <div className="streak-card-glow" />
        <div className="streak-left">
          <motion.div
            className="streak-icon-box"
            animate={streak > 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <span className="streak-emoji">
              {streak === 0 ? '😴' : '🔥'}
            </span>
          </motion.div>
          <div>
            <div className="streak-num-row">
              <motion.span
                className="streak-number"
                key={streak}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >{streak}</motion.span>
              <span className="streak-unit">DAYS</span>
            </div>
            <p className="streak-label">
              {streak === 0 ? 'Start your streak!' :
               streak < 3 ? 'Getting started!' :
               streak < 7 ? 'On a roll!' :
               streak < 14 ? 'Unstoppable!' : 'Legendary!'}
            </p>
          </div>
        </div>
        <div className="streak-right">
          <div className="streak-track">
            <motion.div
              className="streak-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((streak / 7) * 100, 100)}%` }}
              transition={{ duration: 1.3, delay: 0.3, ease: 'easeOut' }}
            />
            {[1,2,3,4,5,6,7].map(n => (
              <div
                key={n}
                className={`streak-tick ${streak >= n ? 'lit' : ''}`}
                style={{ left: `${(n / 7) * 100}%` }}
              />
            ))}
          </div>
          <p className="streak-goal">{streak}/7 days</p>
        </div>
      </motion.div>

      {/* ===== TODAY'S FOCUS ===== */}
      <motion.div className="focus-card" {...fadeUp(0.2)} whileHover={{ y: -3 }}>
        <div className="focus-card-top-bar" />
        <div className="focus-header">
          <h3 className="focus-title">TODAY'S FOCUS</h3>
          {activePlan && <span className="focus-plan-tag">{activePlan.name}</span>}
        </div>

        {!activePlan ? (
          <div className="focus-empty">
            <p>No active plan</p>
            <motion.button
              className="focus-create-btn"
              onClick={() => navigate('/plans')}
              whileTap={{ scale: 0.95 }}
            >Create Plan →</motion.button>
          </div>
        ) : todayFocus?.isRest ? (
          <div className="focus-rest">
            <div className="focus-rest-icon">
              <span>Z</span>
            </div>
            <div>
              <p className="focus-rest-title">REST DAY</p>
              <p className="focus-rest-sub">Recovery is part of the process</p>
            </div>
          </div>
        ) : (
          <div className="focus-body">
            <div className="focus-muscles">
              {todayFocus?.primary && (
                <motion.div className="focus-primary" whileHover={{ scale: 1.02 }}>
                  <span className="focus-mlabel">PRIMARY</span>
                  <span className="focus-mname primary">{todayFocus.primary}</span>
                </motion.div>
              )}
              {todayFocus?.secondary?.length > 0 && (
                <motion.div className="focus-secondary" whileHover={{ scale: 1.02 }}>
                  <span className="focus-mlabel">SECONDARY</span>
                  <span className="focus-mname secondary">{todayFocus.secondary.join(' · ')}</span>
                </motion.div>
              )}
            </div>
            <motion.button
              className="focus-start-btn"
              whileHover={{ scale: 1.02, boxShadow: '0 14px 36px rgba(255,107,107,0.55)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/workouts', {
                state: {
                  preselectedMuscle: todayFocus?.primary,
                  preselectedSecondary: todayFocus?.secondary || [],
                  preselectedEquipment: 'With Weight'
                }
              })}
            >
              START WORKOUT →
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* ===== THIS WEEK ===== */}
      <motion.div className="week-card" {...fadeUp(0.25)}>
        <p className="week-title">THIS WEEK</p>
        <div className="week-row">
          {DAYS.map((day, i) => (
            <div key={day} className={`week-col ${i === todayIdx ? 'is-today' : ''}`}>
              <motion.div
                className={`week-dot ${weekWorkouts[i] ? 'done' : ''} ${i === todayIdx ? 'today' : ''}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 280 }}
                whileHover={{ scale: 1.15 }}
              >
                {weekWorkouts[i] && <span className="week-check">✓</span>}
              </motion.div>
              <span className="week-day-lbl">{day}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== STATS ===== */}
      <StatsGrid stats={stats} />

      {/* ===== INSIGHT ===== */}
      <motion.div className="insight-card" {...fadeUp(0.4)} whileHover={{ y: -3 }}>
        <motion.span
          className="insight-icon"
          animate={{ rotate: [0, 12, -12, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
        >💡</motion.span>
        <p className="insight-text">{getInsight()}</p>
      </motion.div>

    </div>
  )
}