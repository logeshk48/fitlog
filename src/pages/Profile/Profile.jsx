import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import './Profile.css'

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite']
const GOALS = ['Build Muscle', 'Lose Weight', 'Stay Fit', 'Improve Strength', 'Increase Endurance']
const EQUIPMENT = ['With Weight', 'Without Weight', 'Both']
const WORKOUT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const BADGES = [
  { id: 'first_workout', icon: '🏋️', label: 'First Workout', desc: 'Completed first workout', req: 1 },
  { id: 'week_warrior', icon: '⚡', label: 'Week Warrior', desc: '7 workouts completed', req: 7 },
  { id: 'monthly_beast', icon: '🔥', label: 'Monthly Beast', desc: '30 workouts completed', req: 30 },
  { id: 'streak_3', icon: '💪', label: 'On Fire', desc: '3 day streak', req: 3, type: 'streak' },
  { id: 'streak_7', icon: '🌟', label: 'Unstoppable', desc: '7 day streak', req: 7, type: 'streak' },
  { id: 'heavy_lifter', icon: '🏆', label: 'Heavy Lifter', desc: 'Lifted over 50kg', req: 50, type: 'lift' },
]

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

function Profile() {
  const { user } = useContext(AuthContext)
  const [profile, setProfile] = useState(null)
  const [workoutStats, setWorkoutStats] = useState({ total: 0, streak: 0, bestLift: 0 })
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const totalCount = useCounter(workoutStats.total)
  const streakCount = useCounter(workoutStats.streak)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    if (!user) return
    setLoading(true)
    try {
      // Fetch profile
      const profileRef = doc(db, 'profiles', user.uid)
      const profileSnap = await getDoc(profileRef)
      if (profileSnap.exists()) {
        setProfile(profileSnap.data())
        setEditData(profileSnap.data())
      } else {
        const defaultProfile = {
          name: user.displayName || '',
          fitnessLevel: 'Beginner',
          goal: 'Build Muscle',
          height: '',
          weight: '',
          targetWeight: '',
          age: '',
          gender: '',
          equipment: 'Both',
          preferredDays: [],
          notifications: true,
        }
        setProfile(defaultProfile)
        setEditData(defaultProfile)
      }

      // Fetch workout stats
      const q = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const workouts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      let bestLift = 0
      workouts.forEach(w => {
        w.exercises?.forEach(ex => {
          ex.sets?.forEach(s => {
            if (s.weight > bestLift) bestLift = s.weight
          })
        })
      })

      // Streak
      let streak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        const hasWorkout = workouts.some(w => {
          const wDate = w.createdAt?.toDate?.() || new Date(w.date)
          return wDate.toDateString() === date.toDateString()
        })
        if (hasWorkout) streak++
        else if (i > 0) break
      }

      setWorkoutStats({ total: workouts.length, streak, bestLift })
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.uid)
      await setDoc(profileRef, { ...editData, updatedAt: serverTimestamp() }, { merge: true })
      setProfile(editData)
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setShowEdit(false)
      }, 1500)
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await signOut(auth)
    }
  }

  const getBMI = () => {
    if (!profile?.height || !profile?.weight) return null
    const h = parseFloat(profile.height) / 100
    const w = parseFloat(profile.weight)
    if (!h || !w) return null
    const bmi = (w / (h * h)).toFixed(1)
    let status = ''
    if (bmi < 18.5) status = 'Underweight'
    else if (bmi < 25) status = 'Normal'
    else if (bmi < 30) status = 'Overweight'
    else status = 'Obese'
    return { value: bmi, status }
  }

  const getGoalProgress = () => {
    if (!profile?.weight || !profile?.targetWeight) return 0
    const current = parseFloat(profile.weight)
    const target = parseFloat(profile.targetWeight)
    if (!current || !target) return 0
    if (profile.goal === 'Lose Weight') {
      const start = current + 10
      return Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100))
    }
    return Math.min(100, (current / target) * 100)
  }

  const getUnlockedBadges = () => {
    return BADGES.filter(badge => {
      if (badge.type === 'streak') return workoutStats.streak >= badge.req
      if (badge.type === 'lift') return workoutStats.bestLift >= badge.req
      return workoutStats.total >= badge.req
    })
  }

  const getFirstName = () => profile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Champ'
  const bmi = getBMI()
  const goalProgress = getGoalProgress()
  const unlockedBadges = getUnlockedBadges()

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-avatar">
          {getFirstName()[0]?.toUpperCase() || 'F'}
        </div>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="profile-page">

      {/* ===== HEADER ===== */}
      <div className="profile-header animate-1">
        <div className="profile-avatar-wrap">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              {getFirstName()[0]?.toUpperCase()}
            </div>
          )}
          <div className="profile-level-badge">
            {profile?.fitnessLevel || 'Beginner'}
          </div>
        </div>
        <div className="profile-identity">
          <h1 className="profile-name">{profile?.name || user?.displayName || 'Athlete'}</h1>
          <p className="profile-goal-tag">{profile?.goal || 'Build Muscle'}</p>
          <p className="profile-email">{user?.email}</p>
        </div>
        <button className="edit-profile-btn" onClick={() => setShowEdit(true)}>
          Edit
        </button>
      </div>

      {/* ===== QUICK STATS ===== */}
      <div className="profile-stats animate-2">
        <div className="profile-stat">
          <span className="profile-stat-value">{totalCount}</span>
          <span className="profile-stat-label">Workouts</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="profile-stat-value">{streakCount}🔥</span>
          <span className="profile-stat-label">Streak</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="profile-stat-value">{workoutStats.bestLift}kg</span>
          <span className="profile-stat-label">Best Lift</span>
        </div>
      </div>

      {/* ===== BODY SUMMARY ===== */}
      <div className="section-card animate-3">
        <h3 className="section-card-title">Body Summary</h3>
        <div className="body-grid">
          <div className="body-item">
            <span className="body-value">{profile?.height || '—'}</span>
            <span className="body-label">Height (cm)</span>
          </div>
          <div className="body-item">
            <span className="body-value">{profile?.weight || '—'}</span>
            <span className="body-label">Weight (kg)</span>
          </div>
          <div className="body-item">
            <span className="body-value">{profile?.age || '—'}</span>
            <span className="body-label">Age</span>
          </div>
          <div className="body-item">
            <span className="body-value">{profile?.targetWeight || '—'}</span>
            <span className="body-label">Target (kg)</span>
          </div>
        </div>

        {/* BMI Card */}
        {bmi && (
          <div className={`bmi-card ${bmi.status.toLowerCase()}`}>
            <div className="bmi-left">
              <span className="bmi-label">BMI</span>
              <span className="bmi-value">{bmi.value}</span>
            </div>
            <span className="bmi-status">{bmi.status}</span>
          </div>
        )}

        {/* Goal Progress */}
        {profile?.targetWeight && profile?.weight && (
          <div className="goal-progress">
            <div className="goal-progress-header">
              <span className="goal-progress-label">Goal Progress</span>
              <span className="goal-progress-percent">{Math.round(goalProgress)}%</span>
            </div>
            <div className="goal-progress-track">
              <div
                className="goal-progress-fill"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="goal-progress-text">
              {profile.weight}kg → {profile.targetWeight}kg
            </p>
          </div>
        )}
      </div>

      {/* ===== ACHIEVEMENTS ===== */}
      <div className="section-card animate-4">
        <h3 className="section-card-title">Achievements</h3>
        <div className="badges-grid">
          {BADGES.map(badge => {
            const unlocked = getUnlockedBadges().find(b => b.id === badge.id)
            return (
              <div key={badge.id} className={`badge-item ${unlocked ? 'unlocked' : 'locked'}`}>
                <div className="badge-icon">{badge.icon}</div>
                <span className="badge-label">{badge.label}</span>
                {!unlocked && <div className="badge-lock">🔒</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== PREFERENCES ===== */}
      <div className="section-card animate-5">
        <h3 className="section-card-title">Preferences</h3>

        <div className="pref-row">
          <span className="pref-label">Equipment</span>
          <span className="pref-value">{profile?.equipment || 'Both'}</span>
        </div>

        <div className="pref-row">
          <span className="pref-label">Fitness Level</span>
          <span className="pref-value">{profile?.fitnessLevel || 'Beginner'}</span>
        </div>

        <div className="pref-row">
          <span className="pref-label">Preferred Days</span>
          <div className="pref-days">
            {WORKOUT_DAYS.map(day => (
              <span
                key={day}
                className={`pref-day ${profile?.preferredDays?.includes(day) ? 'active' : ''}`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SETTINGS ===== */}
      <div className="section-card animate-6">
        <h3 className="section-card-title">Settings</h3>

        <div className="settings-row">
          <div className="settings-row-left">
            <span className="settings-icon">🔔</span>
            <span className="settings-label">Notifications</span>
          </div>
          <div
            className={`toggle ${profile?.notifications ? 'on' : 'off'}`}
            onClick={() => {
              const updated = { ...profile, notifications: !profile?.notifications }
              setProfile(updated)
              setEditData(updated)
            }}
          >
            <div className="toggle-thumb" />
          </div>
        </div>

        <div className="settings-row" onClick={() => setShowEdit(true)}>
          <div className="settings-row-left">
            <span className="settings-icon">👤</span>
            <span className="settings-label">Edit Profile</span>
          </div>
          <span className="settings-arrow">›</span>
        </div>

        <div className="settings-row danger" onClick={handleLogout}>
          <div className="settings-row-left">
            <span className="settings-icon">🚪</span>
            <span className="settings-label">Logout</span>
          </div>
          <span className="settings-arrow">›</span>
        </div>
      </div>

      {/* ===== EDIT BOTTOM SHEET ===== */}
      {showEdit && (
        <div className="edit-overlay" onClick={() => setShowEdit(false)}>
          <div className="edit-sheet" onClick={e => e.stopPropagation()}>

            <div className="edit-sheet-handle" />

            <div className="edit-sheet-header">
              <h3>Edit Profile</h3>
              <button className="edit-close-btn" onClick={() => setShowEdit(false)}>✕</button>
            </div>

            <div className="edit-form">

              <div className="edit-field">
                <label>Name</label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              <div className="edit-field">
                <label>Fitness Level</label>
                <div className="edit-options">
                  {FITNESS_LEVELS.map(level => (
                    <button
                      key={level}
                      className={`edit-option ${editData.fitnessLevel === level ? 'active' : ''}`}
                      onClick={() => setEditData({ ...editData, fitnessLevel: level })}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="edit-field">
                <label>Main Goal</label>
                <div className="edit-options">
                  {GOALS.map(goal => (
                    <button
                      key={goal}
                      className={`edit-option ${editData.goal === goal ? 'active' : ''}`}
                      onClick={() => setEditData({ ...editData, goal: goal })}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="edit-row">
                <div className="edit-field">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    value={editData.height || ''}
                    onChange={e => setEditData({ ...editData, height: e.target.value })}
                    placeholder="170"
                  />
                </div>
                <div className="edit-field">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    value={editData.weight || ''}
                    onChange={e => setEditData({ ...editData, weight: e.target.value })}
                    placeholder="70"
                  />
                </div>
              </div>

              <div className="edit-row">
                <div className="edit-field">
                  <label>Age</label>
                  <input
                    type="number"
                    value={editData.age || ''}
                    onChange={e => setEditData({ ...editData, age: e.target.value })}
                    placeholder="25"
                  />
                </div>
                <div className="edit-field">
                  <label>Target Weight (kg)</label>
                  <input
                    type="number"
                    value={editData.targetWeight || ''}
                    onChange={e => setEditData({ ...editData, targetWeight: e.target.value })}
                    placeholder="65"
                  />
                </div>
              </div>

              <div className="edit-field">
                <label>Equipment</label>
                <div className="edit-options">
                  {EQUIPMENT.map(eq => (
                    <button
                      key={eq}
                      className={`edit-option ${editData.equipment === eq ? 'active' : ''}`}
                      onClick={() => setEditData({ ...editData, equipment: eq })}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>

              <div className="edit-field">
                <label>Preferred Days</label>
                <div className="edit-days">
                  {WORKOUT_DAYS.map(day => (
                    <button
                      key={day}
                      className={`edit-day ${editData.preferredDays?.includes(day) ? 'active' : ''}`}
                      onClick={() => {
                        const days = editData.preferredDays || []
                        setEditData({
                          ...editData,
                          preferredDays: days.includes(day)
                            ? days.filter(d => d !== day)
                            : [...days, day]
                        })
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={`save-profile-btn ${saveSuccess ? 'success' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Changes'}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Profile