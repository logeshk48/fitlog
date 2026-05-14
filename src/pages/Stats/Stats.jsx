import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import './Stats.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

    let totalVolume = 0
    let bestLift = 0
    const muscleCounts = {}
    const exercisePRs = {}
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
        if (ex.muscleGroup) {
          muscleCounts[ex.muscleGroup] = (muscleCounts[ex.muscleGroup] || 0) + 1
        }
        ex.sets?.forEach(set => {
          const vol = (set.weight || 0) * (set.reps || 0)
          totalVolume += vol
          if (set.weight > bestLift) bestLift = set.weight
          if (isThisWeek) dayVolumes[dayName] = (dayVolumes[dayName] || 0) + vol
          if (ex.name && set.weight > 0) {
            if (!exercisePRs[ex.name] || set.weight > exercisePRs[ex.name].weight) {
              exercisePRs[ex.name] = {
                weight: set.weight, reps: set.reps,
                date: wDate, muscle: ex.muscleGroup
              }
            }
          }
        })
      })
    })

    // Streak
    let currentStreak = 0, longestStreak = 0, tempStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const hasWorkout = data.some(w => {
        const wDate = w.createdAt?.toDate?.() || new Date(w.date)
        return wDate.toDateString() === date.toDateString()
      })
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
      total: data.length,
      totalVolume: Math.round(totalVolume),
      bestLift,
      avgPerWeek: (data.length / weeksActive).toFixed(1),
      currentStreak,
      longestStreak,
      thisMonth
    })

    const totalMuscleCount = Object.values(muscleCounts).reduce((a, b) => a + b, 0)
    setMuscleData(
      Object.entries(muscleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({
          name, count,
          percent: Math.round((count / totalMuscleCount) * 100)
        }))
    )

    setWeeklyData(DAYS.map(day => ({
      day, volume: Math.round(dayVolumes[day] || 0)
    })))

    setPersonalRecords(
      Object.entries(exercisePRs)
        .sort((a, b) => b[1].weight - a[1].weight)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data }))
    )

    const insightsList = []
    if (currentStreak > 0) insightsList.push(`🔥 You're on a ${currentStreak}-day streak! Keep it up!`)
    if (muscleData[0] || Object.keys(muscleCounts).length > 0) {
      const top = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0]
      if (top) insightsList.push(`💪 You train ${top[0]} the most (${Math.round((top[1]/totalMuscleCount)*100)}% of workouts)`)
    }
    const leastEntry = Object.entries(muscleCounts).sort((a, b) => a[1] - b[1])[0]
    if (leastEntry) insightsList.push(`⚠️ You rarely train ${leastEntry[0]}. Consider adding it!`)
    if (bestLift > 0) insightsList.push(`🏆 Your heaviest lift is ${bestLift}kg. Beast mode!`)
    if (thisMonth > 0) insightsList.push(`📅 You've worked out ${thisMonth} times this month!`)
    const strongestDay = DAYS.reduce((a, b) => dayVolumes[a] > dayVolumes[b] ? a : b)
    if (dayVolumes[strongestDay] > 0) insightsList.push(`⚡ Your strongest day this week is ${strongestDay}!`)
    if (longestStreak > currentStreak && longestStreak > 0) insightsList.push(`🎯 Your best streak was ${longestStreak} days. Can you beat it?`)
    setInsights(insightsList)
  }

  const tabs = ['overview', 'records', 'history', 'insights']
  const maxVolume = Math.max(...weeklyData.map(d => d.volume), 1)
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  const insightColors = [
    { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)' },
    { bg: 'rgba(78,205,196,0.08)', border: 'rgba(78,205,196,0.2)' },
    { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
    { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
    { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  ]

  const muscleColors = [
    'var(--color-primary)',
    'var(--color-secondary)',
    'var(--color-purple)',
    'var(--color-orange)',
    'var(--color-green)',
    'var(--color-blue)',
  ]

  if (loading) {
    return (
      <div className="stats-loading">
        <div className="stats-loading-icon">📊</div>
        <p>Analyzing your data...</p>
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="stats-empty">
        <div className="stats-page-header">
          <h1 className="stats-page-title">Stats</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No data yet</h3>
          <p>Complete your first workout to see your stats!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stats-page">

      {/* Header */}
      <div className="stats-page-header">
        <h1 className="stats-page-title">Stats</h1>
        <p className="stats-subtitle">{overview.total} workouts tracked</p>
      </div>

      {/* Tabs */}
      <div className="stats-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`stats-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div className="tab-content">

          {/* Overview Cards */}
          <div className="overview-grid">
            <div className="overview-card coral">
              <span className="overview-value">{overview.total}</span>
              <span className="overview-label">Total Workouts</span>
            </div>
            <div className="overview-card teal">
              <span className="overview-value">{(overview.totalVolume / 1000).toFixed(1)}t</span>
              <span className="overview-label">Total Volume</span>
            </div>
            <div className="overview-card purple">
              <span className="overview-value">{overview.bestLift}kg</span>
              <span className="overview-label">Best Lift</span>
            </div>
            <div className="overview-card green">
              <span className="overview-value">{overview.avgPerWeek}</span>
              <span className="overview-label">Avg / Week</span>
            </div>
            <div className="overview-card orange">
              <span className="overview-value">{overview.currentStreak}🔥</span>
              <span className="overview-label">Current Streak</span>
            </div>
            <div className="overview-card blue">
              <span className="overview-value">{overview.thisMonth}</span>
              <span className="overview-label">This Month</span>
            </div>
          </div>

          {/* Weekly Volume Chart */}
          <div className="chart-card">
            <h3 className="chart-title">This Week's Volume</h3>
            <div className="bar-chart">
              {weeklyData.map((d, i) => (
                <div key={d.day} className="bar-item">
                  <span className="bar-volume">
                    {d.volume > 0 ? `${(d.volume / 1000).toFixed(1)}t` : ''}
                  </span>
                  <div className="bar-wrap">
                    <div
                      className={`bar-fill ${i === todayIndex ? 'today' : ''} ${d.volume > 0 ? 'active' : ''}`}
                      style={{ height: `${Math.max((d.volume / maxVolume) * 100, d.volume > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className={`bar-label ${i === todayIndex ? 'today' : ''}`}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Muscle Distribution */}
          <div className="chart-card">
            <h3 className="chart-title">Muscle Distribution</h3>
            <div className="muscle-bars">
              {muscleData.map((m, i) => (
                <div key={m.name} className="muscle-bar-row">
                  <span className="muscle-bar-name">{m.name}</span>
                  <div className="muscle-bar-track">
                    <div
                      className="muscle-bar-fill"
                      style={{
                        width: `${m.percent}%`,
                        background: muscleColors[i % muscleColors.length]
                      }}
                    />
                  </div>
                  <span className="muscle-bar-percent">{m.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Streak Stats */}
          <div className="streak-stats-card">
            <div className="streak-stat">
              <span className="streak-stat-value">{overview.currentStreak}🔥</span>
              <span className="streak-stat-label">Current Streak</span>
            </div>
            <div className="streak-divider" />
            <div className="streak-stat">
              <span className="streak-stat-value">{overview.longestStreak}</span>
              <span className="streak-stat-label">Best Streak</span>
            </div>
            <div className="streak-divider" />
            <div className="streak-stat">
              <span className="streak-stat-value">{overview.thisMonth}</span>
              <span className="streak-stat-label">This Month</span>
            </div>
          </div>

        </div>
      )}

      {/* ===== RECORDS TAB ===== */}
      {activeTab === 'records' && (
        <div className="tab-content">
          <h3 className="section-label">🏆 Personal Records</h3>
          {personalRecords.length === 0 ? (
            <div className="no-records">
              <p>No records yet. Start lifting! 💪</p>
            </div>
          ) : (
            <div className="records-list">
              {personalRecords.map((pr, i) => (
                <div key={pr.name} className="record-card">
                  <div className="record-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="record-info">
                    <h4 className="record-name">{pr.name}</h4>
                    <span className="record-muscle">{pr.muscle}</span>
                  </div>
                  <div className="record-weight">
                    <span className="record-value">{pr.weight}kg</span>
                    <span className="record-reps">× {pr.reps} reps</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== HISTORY TAB ===== */}
      {activeTab === 'history' && (
        <div className="tab-content">
          <h3 className="section-label">📅 Workout History</h3>
          <div className="history-list">
            {workouts.map((workout) => {
              const date = workout.createdAt?.toDate?.() || new Date(workout.date)
              const vol = workout.exercises?.reduce((acc, ex) =>
                acc + (ex.sets?.reduce((a, s) =>
                  a + (s.weight || 0) * (s.reps || 0), 0
                ) || 0), 0
              ) || 0
              const muscles = [...new Set(workout.exercises?.map(ex => ex.muscleGroup).filter(Boolean))]
              return (
                <div key={workout.id} className="history-card">
                  <div className="history-date">
                    <span className="history-day">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="history-full-date">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="history-info">
                    <div className="history-muscles">
                      {muscles.slice(0, 3).map(m => (
                        <span key={m} className="history-muscle-tag">{m}</span>
                      ))}
                    </div>
                    <div className="history-meta">
                      <span>{workout.exercises?.length || 0} exercises</span>
                      <span>·</span>
                      <span>{Math.round(vol)}kg volume</span>
                    </div>
                  </div>
                  <div className="history-duration">
                    {workout.duration && workout.duration > 0
                      ? `${Math.floor(workout.duration / 60)}m`
                      : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== INSIGHTS TAB ===== */}
      {activeTab === 'insights' && (
        <div className="tab-content">
          <h3 className="section-label">⚡ Smart Insights</h3>
          <div className="insights-list">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="insight-item"
                style={{
                  background: insightColors[i % insightColors.length].bg,
                  borderColor: insightColors[i % insightColors.length].border
                }}
              >
                <p>{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default Stats