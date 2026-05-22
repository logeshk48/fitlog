import { useState, useEffect, useRef, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  BarChart2, Trophy, Clock, Lightbulb,
  TrendingUp, Zap, Calendar, Target, Flame
} from 'lucide-react'
import './Stats.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ================================
// COUNT UP HOOK
// ================================
function useCountUp(target, duration = 1200, startOnView = true) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView && startOnView) return
    if (target === 0) return
    let start = 0
    const steps = 60
    const increment = target / steps
    const stepDuration = duration / steps
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, stepDuration)
    return () => clearInterval(timer)
  }, [target, inView])

  return { count, ref }
}

// ================================
// ANIMATED STAT CARD
// ================================
function StatCard({ value, label, color, icon, index, suffix = '' }) {
  const { count, ref } = useCountUp(
    typeof value === 'number' ? value : parseFloat(value) || 0
  )

  const displayValue = typeof value === 'number'
    ? `${count}${suffix}`
    : value

  return (
    <motion.div
      ref={ref}
      className="st-stat-card"
      style={{ '--sc': color }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -3 }}
    >
      <div className="st-stat-icon" style={{ color, background: `${color}15` }}>
        {icon}
      </div>
      <span className="st-stat-val" style={{ color }}>{displayValue}</span>
      <span className="st-stat-lbl">{label}</span>
    </motion.div>
  )
}

// ================================
// ANIMATED BAR CHART
// ================================
function BarChart({ data, todayIndex }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const maxVolume = Math.max(...data.map(d => d.volume), 1)

  return (
    <div ref={ref} className="st-bar-chart">
      {data.map((d, i) => {
        const height = Math.max((d.volume / maxVolume) * 100, d.volume > 0 ? 6 : 0)
        const isToday = i === todayIndex
        return (
          <div key={d.day} className="st-bar-item">
            <span className="st-bar-vol">
              {d.volume > 0 ? `${(d.volume / 1000).toFixed(1)}t` : ''}
            </span>
            <div className="st-bar-track">
              <motion.div
                className={`st-bar-fill ${isToday ? 'today' : ''} ${d.volume > 0 ? 'active' : ''}`}
                initial={{ height: 0 }}
                animate={inView ? { height: `${height}%` } : { height: 0 }}
                transition={{ delay: i * 0.06 + 0.2, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
            <span className={`st-bar-lbl ${isToday ? 'today' : ''}`}>{d.day}</span>
          </div>
        )
      })}
    </div>
  )
}

// ================================
// ANIMATED MUSCLE BAR
// ================================
function MuscleBar({ name, percent, color, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      className="st-muscle-row"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <span className="st-muscle-name">{name}</span>
      <div className="st-muscle-track">
        <motion.div
          className="st-muscle-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${percent}%` } : { width: 0 }}
          transition={{ delay: index * 0.08 + 0.3, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
      <span className="st-muscle-pct">{percent}%</span>
    </motion.div>
  )
}

// ================================
// SKELETON LOADER
// ================================
function SkeletonCard({ delay = 0 }) {
  return (
    <motion.div
      className="st-skeleton"
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.4, repeat: Infinity, delay }}
    />
  )
}

// ================================
// MAIN COMPONENT
// ================================
function Stats() {
  const { user } = useContext(AuthContext)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [overview, setOverview] = useState({
    total: 0, totalVolume: 0, bestLift: 0,
    avgPerWeek: 0, currentStreak: 0, longestStreak: 0, thisMonth: 0,
  })
  const [muscleData, setMuscleData] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [personalRecords, setPersonalRecords] = useState([])
  const [insights, setInsights] = useState([])

  useEffect(() => { fetchWorkouts() }, [])

  const fetchWorkouts = async () => {
    if (!user) return
    setLoading(true)
    try {
      const q = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setWorkouts(data)
      computeStats(data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const computeStats = (data) => {
    if (data.length === 0) return
    let totalVolume = 0, bestLift = 0
    const muscleCounts = {}, exercisePRs = {}
    const dayVolumes = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const now = new Date()
    const thisMonth = data.filter(w => {
      const d = w.createdAt?.toDate?.() || new Date(w.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const monday = new Date(now)
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay()
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)

    data.forEach(workout => {
      const wDate = workout.createdAt?.toDate?.() || new Date(workout.date)
      const dayName = dayNames[wDate.getDay()]
      const isThisWeek = wDate >= monday
      workout.exercises?.forEach(ex => {
        if (ex.muscleGroup) muscleCounts[ex.muscleGroup] = (muscleCounts[ex.muscleGroup] || 0) + 1
        ex.sets?.forEach(set => {
          const vol = (set.weight || 0) * (set.reps || 0)
          totalVolume += vol
          if (set.weight > bestLift) bestLift = set.weight
          if (isThisWeek) dayVolumes[dayName] = (dayVolumes[dayName] || 0) + vol
          if (ex.name && set.weight > 0) {
            if (!exercisePRs[ex.name] || set.weight > exercisePRs[ex.name].weight) {
              exercisePRs[ex.name] = { weight: set.weight, reps: set.reps, date: wDate, muscle: ex.muscleGroup }
            }
          }
        })
      })
    })

    let currentStreak = 0, longestStreak = 0, tempStreak = 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const date = new Date(today); date.setDate(today.getDate() - i)
      const hasWorkout = data.some(w => (w.createdAt?.toDate?.() || new Date(w.date)).toDateString() === date.toDateString())
      if (hasWorkout) {
        tempStreak++
        if (i === 0 || currentStreak > 0) currentStreak = tempStreak
        if (tempStreak > longestStreak) longestStreak = tempStreak
      } else if (i > 0) tempStreak = 0
    }

    const firstWorkout = data[data.length - 1]
    const firstDate = firstWorkout?.createdAt?.toDate?.() || new Date(firstWorkout?.date)
    const weeksActive = Math.max(1, Math.ceil((now - firstDate) / (7 * 24 * 60 * 60 * 1000)))

    setOverview({
      total: data.length, totalVolume: Math.round(totalVolume),
      bestLift, avgPerWeek: parseFloat((data.length / weeksActive).toFixed(1)),
      currentStreak, longestStreak, thisMonth
    })

    const totalMuscleCount = Object.values(muscleCounts).reduce((a, b) => a + b, 0)
    setMuscleData(
      Object.entries(muscleCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, count]) => ({ name, count, percent: Math.round((count / totalMuscleCount) * 100) }))
    )

    setWeeklyData(DAYS.map(day => ({ day, volume: Math.round(dayVolumes[day] || 0) })))

    setPersonalRecords(
      Object.entries(exercisePRs).sort((a, b) => b[1].weight - a[1].weight).slice(0, 10)
        .map(([name, data]) => ({ name, ...data }))
    )

    const insightsList = []
    if (currentStreak > 0) insightsList.push({ icon: <Flame size={16} />, text: `You're on a ${currentStreak}-day streak! Keep it up!`, color: '#FF6B6B' })
    const top = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0]
    if (top) insightsList.push({ icon: <Target size={16} />, text: `You train ${top[0]} the most (${Math.round((top[1] / totalMuscleCount) * 100)}% of workouts)`, color: '#4ECDC4' })
    const sortedMuscles = Object.entries(muscleCounts).sort((a, b) => a[1] - b[1])
    if (sortedMuscles.length > 1) insightsList.push({ icon: <Zap size={16} />, text: `You rarely train ${sortedMuscles[0][0]}. Consider adding it!`, color: '#A855F7' })
    if (bestLift > 0) insightsList.push({ icon: <Trophy size={16} />, text: `Your heaviest lift is ${bestLift}kg. Beast mode!`, color: '#FFE66D' })
    if (thisMonth > 0) insightsList.push({ icon: <Calendar size={16} />, text: `You've worked out ${thisMonth} times this month!`, color: '#22C55E' })
    if (longestStreak > currentStreak && longestStreak > 0) insightsList.push({ icon: <TrendingUp size={16} />, text: `Your best streak was ${longestStreak} days. Can you beat it?`, color: '#F97316' })
    setInsights(insightsList)
  }

  const TABS = [
    { key: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { key: 'records', label: 'Records', icon: <Trophy size={14} /> },
    { key: 'history', label: 'History', icon: <Clock size={14} /> },
    { key: 'insights', label: 'Insights', icon: <Lightbulb size={14} /> },
  ]

  const MUSCLE_COLORS = ['#FF6B6B', '#4ECDC4', '#A855F7', '#F97316', '#22C55E', '#3B82F6']
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  // Loading
  if (loading) {
    return (
      <div className="st-page">
        <div className="st-header">
          <SkeletonCard delay={0} />
        </div>
        <div className="st-skeleton-grid">
          {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} delay={i * 0.08} />)}
        </div>
        <SkeletonCard delay={0.5} />
        <SkeletonCard delay={0.6} />
      </div>
    )
  }

  // Empty
  if (workouts.length === 0) {
    return (
      <div className="st-page">
        <motion.div className="st-header" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="st-title">STATS</h1>
        </motion.div>
        <motion.div
          className="st-empty"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="st-empty-icon"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BarChart2 size={56} color="rgba(255,255,255,0.1)" />
          </motion.div>
          <h3 className="st-empty-title">No data yet</h3>
          <p className="st-empty-sub">Complete your first workout to see your stats!</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="st-page">

      {/* Header */}
      <motion.div
        className="st-header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="st-title">STATS</h1>
          <p className="st-subtitle">{overview.total} workouts tracked</p>
        </div>
        <motion.div
          className="st-header-badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        >
          <Flame size={14} color="#FF6B6B" />
          <span>{overview.currentStreak}d</span>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="st-tabs"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {TABS.map(tab => (
          <motion.button
            key={tab.key}
            className={`st-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            whileTap={{ scale: 0.95 }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >

          {/* ===== OVERVIEW ===== */}
          {activeTab === 'overview' && (
            <div className="st-tab-content">

              {/* Stat Cards */}
              <div className="st-stat-grid">
                <StatCard value={overview.total} label="Total Workouts" color="#FF6B6B" icon={<BarChart2 size={16} />} index={0} />
                <StatCard value={overview.totalVolume} label="Total Volume" color="#4ECDC4" icon={<TrendingUp size={16} />} index={1} suffix="kg" />
                <StatCard value={overview.bestLift} label="Best Lift" color="#A855F7" icon={<Trophy size={16} />} index={2} suffix="kg" />
                <StatCard value={overview.avgPerWeek} label="Avg / Week" color="#F97316" icon={<Zap size={16} />} index={3} />
                <StatCard value={overview.currentStreak} label="Streak" color="#FF6B6B" icon={<Flame size={16} />} index={4} />
                <StatCard value={overview.thisMonth} label="This Month" color="#22C55E" icon={<Calendar size={16} />} index={5} />
              </div>

              {/* Weekly Chart */}
              <motion.div
                className="st-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="st-card-title">THIS WEEK'S VOLUME</h3>
                <BarChart data={weeklyData} todayIndex={todayIndex} />
              </motion.div>

              {/* Muscle Distribution */}
              <motion.div
                className="st-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h3 className="st-card-title">MUSCLE DISTRIBUTION</h3>
                <div className="st-muscle-bars">
                  {muscleData.map((m, i) => (
                    <MuscleBar
                      key={m.name}
                      name={m.name}
                      percent={m.percent}
                      color={MUSCLE_COLORS[i % MUSCLE_COLORS.length]}
                      index={i}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Streak Card */}
              <motion.div
                className="st-streak-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                {[
                  { value: overview.currentStreak, label: 'Current Streak', color: '#FF6B6B', suffix: 'd' },
                  { value: overview.longestStreak, label: 'Best Streak', color: '#FFE66D', suffix: 'd' },
                  { value: overview.thisMonth, label: 'This Month', color: '#4ECDC4', suffix: '' },
                ].map((item, i) => (
                  <div key={i} className="st-streak-item">
                    {i > 0 && <div className="st-streak-divider" />}
                    <div className="st-streak-inner">
                      <motion.span
                        className="st-streak-val"
                        style={{ color: item.color, textShadow: `0 0 16px ${item.color}50` }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 200 }}
                      >
                        {item.value}{item.suffix}
                      </motion.span>
                      <span className="st-streak-lbl">{item.label}</span>
                    </div>
                  </div>
                ))}
              </motion.div>

            </div>
          )}

          {/* ===== RECORDS ===== */}
          {activeTab === 'records' && (
            <div className="st-tab-content">
              <p className="st-section-label">PERSONAL RECORDS</p>
              {personalRecords.length === 0 ? (
                <div className="st-no-data">No records yet. Start lifting!</div>
              ) : (
                <div className="st-records">
                  {personalRecords.map((pr, i) => (
                    <motion.div
                      key={pr.name}
                      className={`st-record-card ${i < 3 ? `rank-${i}` : ''}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.35 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="st-record-rank">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                          <span className="st-record-num">#{i + 1}</span>
                        )}
                      </div>
                      <div className="st-record-info">
                        <h4 className="st-record-name">{pr.name}</h4>
                        <span className="st-record-muscle">{pr.muscle}</span>
                      </div>
                      <div className="st-record-weight">
                        <motion.span
                          className="st-record-val"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.06 + 0.2, type: 'spring', stiffness: 200 }}
                        >
                          {pr.weight}kg
                        </motion.span>
                        <span className="st-record-reps">× {pr.reps} reps</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== HISTORY ===== */}
          {activeTab === 'history' && (
            <div className="st-tab-content">
              <p className="st-section-label">WORKOUT HISTORY</p>
              <div className="st-history">
                {workouts.map((workout, i) => {
                  const date = workout.createdAt?.toDate?.() || new Date(workout.date)
                  const vol = workout.exercises?.reduce((acc, ex) =>
                    acc + (ex.sets?.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0) || 0), 0
                  ) || 0
                  const muscles = [...new Set(workout.exercises?.map(ex => ex.muscleGroup).filter(Boolean))]
                  const primaryMuscle = muscles[0]
                  const MUSCLE_COLORS_MAP = {
                    'Chest': '#FF6B6B', 'Back': '#4ECDC4', 'Shoulders': '#A855F7',
                    'Biceps': '#3B82F6', 'Triceps': '#F97316', 'Forearms': '#FFE66D',
                    'Core': '#22C55E', 'Legs': '#EC4899', 'Glutes': '#FF8E53',
                    'Calves': '#4d9fff', 'Full Body': '#FFE66D'
                  }
                  const borderColor = MUSCLE_COLORS_MAP[primaryMuscle] || '#FF6B6B'

                  return (
                    <motion.div
                      key={workout.id}
                      className="st-history-card"
                      style={{ '--hc': borderColor }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.35 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="st-history-date">
                        <span className="st-history-day">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="st-history-full">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="st-history-info">
                        <div className="st-history-muscles">
                          {muscles.slice(0, 3).map(m => (
                            <span
                              key={m}
                              className="st-history-tag"
                              style={{ color: MUSCLE_COLORS_MAP[m] || '#aaa', borderColor: `${MUSCLE_COLORS_MAP[m]}30` || 'rgba(255,255,255,0.1)' }}
                            >{m}</span>
                          ))}
                        </div>
                        <div className="st-history-meta">
                          <span>{workout.exercises?.length || 0} exercises</span>
                          <span>·</span>
                          <span>{Math.round(vol)}kg vol</span>
                        </div>
                      </div>
                      <span className="st-history-dur">
                        {workout.duration && workout.duration > 0
                          ? `${Math.floor(workout.duration / 60)}m`
                          : '—'}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ===== INSIGHTS ===== */}
          {activeTab === 'insights' && (
            <div className="st-tab-content">
              <p className="st-section-label">SMART INSIGHTS</p>
              <div className="st-insights">
                {insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    className="st-insight-card"
                    style={{ '--ic': insight.color }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="st-insight-icon" style={{ color: insight.color, background: `${insight.color}15` }}>
                      {insight.icon}
                    </div>
                    <p className="st-insight-text">{insight.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default Stats