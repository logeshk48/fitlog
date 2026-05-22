import { useState, useEffect, useContext, useRef } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Pencil, LogOut, Bell, ChevronRight, Check, X, Zap } from 'lucide-react'
import './Profile.css'

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite']
const GOALS = ['Build Muscle', 'Lose Weight', 'Stay Fit', 'Improve Strength', 'Increase Endurance']
const EQUIPMENT = ['With Weight', 'Without Weight', 'Both']
const WORKOUT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const AVATARS = [
  { id: 'felix', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
  { id: 'aneka', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka' },
  { id: 'mia', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mia' },
  { id: 'jake', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jake' },
  { id: 'sara', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sara' },
  { id: 'alex', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex' },
  { id: 'luna', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna' },
  { id: 'max', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Max' },
  { id: 'zoe', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe' },
]

const BADGES = [
  { id: 'first_workout', label: 'First Rep', desc: 'Completed first workout', req: 1, color: '#FF6B6B' },
  { id: 'week_warrior', label: 'Week Warrior', desc: '7 workouts', req: 7, color: '#4ECDC4' },
  { id: 'monthly_beast', label: 'Monthly Beast', desc: '30 workouts', req: 30, color: '#A855F7' },
  { id: 'streak_3', label: 'On Fire', desc: '3 day streak', req: 3, type: 'streak', color: '#F97316' },
  { id: 'streak_7', label: 'Unstoppable', desc: '7 day streak', req: 7, type: 'streak', color: '#FFE66D' },
  { id: 'heavy_lifter', label: 'Heavy Lifter', desc: 'Lifted 50kg+', req: 50, type: 'lift', color: '#22C55E' },
]

// ================================
// SVG PROGRESS RING
// ================================
function ProgressRing({ percent, color = '#FF6B6B', size = 120, stroke = 8, label, value }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div ref={ref} className="pf-ring-wrap">
      <svg width={size} height={size} className="pf-ring-svg">
        <defs>
          <linearGradient id={`ring-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={`${color}88`} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`url(#ring-grad-${color.replace('#', '')})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <div className="pf-ring-label">
        <motion.span
          className="pf-ring-value"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >{value}</motion.span>
        <span className="pf-ring-text">{label}</span>
      </div>
    </div>
  )
}

// ================================
// STREAK FLAME SVG
// ================================
function StreakFlame({ streak }) {
  if (streak === 0) return (
    <div className="pf-flame-wrap">
      <svg width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 38 C8 38 4 32 4 26 C4 20 8 16 12 12 C12 18 14 20 16 20 C14 16 16 8 22 4 C22 12 26 16 28 22 C28 30 24 38 16 38Z"
          fill="rgba(255,255,255,0.1)" />
      </svg>
      <span className="pf-flame-count" style={{ color: 'rgba(255,255,255,0.2)' }}>0</span>
    </div>
  )

  const intensity = Math.min(streak / 14, 1)
  const color1 = streak >= 7 ? '#FF3B3B' : streak >= 3 ? '#FF6B6B' : '#FF8E53'
  const color2 = streak >= 7 ? '#FF6B6B' : '#FFE66D'

  return (
    <div className="pf-flame-wrap">
      <motion.svg
        width="32" height="40" viewBox="0 0 32 40"
        animate={{ scaleY: [1, 1.05, 1], scaleX: [1, 0.97, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        <motion.path
          d="M16 38 C8 38 4 32 4 26 C4 20 8 16 12 12 C12 18 14 20 16 20 C14 16 16 8 22 4 C22 12 26 16 28 22 C28 30 24 38 16 38Z"
          fill="url(#flameGrad)"
          filter={`drop-shadow(0 0 ${4 + intensity * 8}px ${color1})`}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        {streak >= 3 && (
          <motion.path
            d="M16 32 C12 32 10 28 10 25 C10 22 12 20 14 18 C14 21 15 22 16 22 C15 20 16 16 19 14 C19 18 21 20 22 23 C22 27 20 32 16 32Z"
            fill="rgba(255,255,255,0.3)"
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
          />
        )}
      </motion.svg>
      <motion.span
        className="pf-flame-count"
        style={{ color: color1, textShadow: `0 0 12px ${color1}60` }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >{streak}</motion.span>
    </div>
  )
}

// ================================
// BADGE ITEM
// ================================
function BadgeItem({ badge, unlocked, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  const BADGE_ICONS = {
    'first_workout': '🏋️',
    'week_warrior': '⚡',
    'monthly_beast': '🔥',
    'streak_3': '💪',
    'streak_7': '🌟',
    'heavy_lifter': '🏆',
  }

  return (
    <motion.div
      ref={ref}
      className={`pf-badge ${unlocked ? 'unlocked' : 'locked'}`}
      style={unlocked ? { '--bc': badge.color } : {}}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
      whileTap={{ scale: 0.94 }}
    >
      {unlocked && (
        <motion.div
          className="pf-badge-glow"
          style={{ background: `radial-gradient(circle, ${badge.color}30, transparent 70%)` }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}
      <span className="pf-badge-icon">{BADGE_ICONS[badge.id]}</span>
      <span className="pf-badge-label">{badge.label}</span>
      {unlocked && (
        <motion.div
          className="pf-badge-check"
          style={{ background: badge.color }}
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ delay: index * 0.08 + 0.3, type: 'spring', stiffness: 300 }}
        >
          <Check size={8} color="white" />
        </motion.div>
      )}
      {!unlocked && <div className="pf-badge-lock">🔒</div>}
    </motion.div>
  )
}

// ================================
// MAIN COMPONENT
// ================================
function Profile() {
  const { user } = useContext(AuthContext)
  const [profile, setProfile] = useState(null)
  const [workoutStats, setWorkoutStats] = useState({ total: 0, streak: 0, bestLift: 0 })
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    if (!user) return
    setLoading(true)
    try {
      const profileRef = doc(db, 'profiles', user.uid)
      const profileSnap = await getDoc(profileRef)
      if (profileSnap.exists()) {
        setProfile(profileSnap.data())
        setEditData(profileSnap.data())
      } else {
        const defaultProfile = {
          name: user.displayName || '', fitnessLevel: 'Beginner',
          goal: 'Build Muscle', height: '', weight: '', targetWeight: '',
          age: '', gender: '', equipment: 'Both', preferredDays: [],
          notifications: true, avatarId: '',
        }
        setProfile(defaultProfile)
        setEditData(defaultProfile)
      }

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
          ex.sets?.forEach(s => { if (s.weight > bestLift) bestLift = s.weight })
        })
      })

      let streak = 0
      const today = new Date(); today.setHours(0, 0, 0, 0)
      for (let i = 0; i < 30; i++) {
        const date = new Date(today); date.setDate(today.getDate() - i)
        const has = workouts.some(w =>
          (w.createdAt?.toDate?.() || new Date(w.date)).toDateString() === date.toDateString()
        )
        if (has) streak++
        else if (i > 0) break
      }

      setWorkoutStats({ total: workouts.length, streak, bestLift })
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'profiles', user.uid),
        { ...editData, updatedAt: serverTimestamp() },
        { merge: true }
      )
      setProfile(editData)
      setSaveSuccess(true)
      setTimeout(() => { setSaveSuccess(false); setShowEdit(false) }, 1500)
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) await signOut(auth)
  }

  const getBMI = () => {
    if (!profile?.height || !profile?.weight) return null
    const h = parseFloat(profile.height) / 100
    const w = parseFloat(profile.weight)
    if (!h || !w) return null
    const bmi = (w / (h * h)).toFixed(1)
    const status = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
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

  const getUnlockedBadges = () => BADGES.filter(badge => {
    if (badge.type === 'streak') return workoutStats.streak >= badge.req
    if (badge.type === 'lift') return workoutStats.bestLift >= badge.req
    return workoutStats.total >= badge.req
  })

  const getFirstName = () =>
    profile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Champ'

  const getAvatarUrl = (id) => AVATARS.find(a => a.id === id)?.url

  const bmi = getBMI()
  const goalProgress = getGoalProgress()

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }
  })

  if (loading) {
    return (
      <div className="pf-loading">
        <motion.div
          className="pf-loading-avatar"
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          {getFirstName()[0]?.toUpperCase() || 'F'}
        </motion.div>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="pf-page">

      {/* ===== HERO ===== */}
      <motion.div className="pf-hero" {...fadeUp(0)}>
        <div className="pf-hero-bg" />

        <div className="pf-avatar-section">
          <div className="pf-avatar-ring-wrap">
            <svg className="pf-avatar-ring-svg" viewBox="0 0 110 110">
              <defs>
                <linearGradient id="avatarRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF6B6B" />
                  <stop offset="100%" stopColor="#4ECDC4" />
                </linearGradient>
              </defs>
              <circle cx="55" cy="55" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              <motion.circle
                cx="55" cy="55" r="50"
                fill="none"
                stroke="url(#avatarRingGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                initial={{ strokeDashoffset: `${2 * Math.PI * 50}` }}
                animate={{ strokeDashoffset: `${2 * Math.PI * 50 * (1 - Math.min(workoutStats.total / 50, 1))}` }}
                transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </svg>
            <div className="pf-avatar-inner">
              {/* ✅ DiceBear avatar or Google photo or letter */}
              {profile?.avatarId ? (
                <img
                  src={getAvatarUrl(profile.avatarId)}
                  alt="avatar"
                  className="pf-avatar-img"
                />
              ) : user?.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="pf-avatar-img" />
              ) : (
                <div className="pf-avatar-placeholder">
                  {getFirstName()[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <motion.div
              className="pf-level-badge"
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
            >
              {profile?.fitnessLevel || 'Beginner'}
            </motion.div>
          </div>
        </div>

        <motion.div className="pf-identity" {...fadeUp(0.15)}>
          <h1 className="pf-name">{getFirstName().toUpperCase()}</h1>
          <div className="pf-goal-tag">{profile?.goal || 'Build Muscle'}</div>
          <p className="pf-email">{user?.email}</p>
        </motion.div>

        <motion.button
          className="pf-edit-btn"
          onClick={() => setShowEdit(true)}
          whileTap={{ scale: 0.92 }}
          {...fadeUp(0.2)}
        >
          <Pencil size={14} />
          EDIT
        </motion.button>
      </motion.div>

      {/* ===== QUICK STATS ===== */}
      <motion.div className="pf-stats-row" {...fadeUp(0.1)}>
        <div className="pf-stat">
          <span className="pf-stat-val">{workoutStats.total}</span>
          <span className="pf-stat-lbl">WORKOUTS</span>
        </div>
        <div className="pf-stat-sep" />
        <div className="pf-stat">
          <StreakFlame streak={workoutStats.streak} />
          <span className="pf-stat-lbl">STREAK</span>
        </div>
        <div className="pf-stat-sep" />
        <div className="pf-stat">
          <span className="pf-stat-val">{workoutStats.bestLift}kg</span>
          <span className="pf-stat-lbl">BEST LIFT</span>
        </div>
      </motion.div>

      {/* ===== PROGRESS RINGS ===== */}
      {(profile?.weight || goalProgress > 0) && (
        <motion.div className="pf-rings-card" {...fadeUp(0.2)}>
          <p className="pf-card-title">PROGRESS</p>
          <div className="pf-rings-row">
            <ProgressRing
              percent={Math.min((workoutStats.total / 50) * 100, 100)}
              color="#FF6B6B"
              value={workoutStats.total}
              label="Workouts"
            />
            <ProgressRing
              percent={Math.min((workoutStats.streak / 7) * 100, 100)}
              color="#FFE66D"
              value={`${workoutStats.streak}d`}
              label="Streak"
            />
            <ProgressRing
              percent={goalProgress}
              color="#4ECDC4"
              value={`${Math.round(goalProgress)}%`}
              label="Goal"
            />
          </div>
        </motion.div>
      )}

      {/* ===== BODY SUMMARY ===== */}
      <motion.div className="pf-card" {...fadeUp(0.25)}>
        <p className="pf-card-title">BODY SUMMARY</p>
        <div className="pf-body-grid">
          {[
            { val: profile?.height || '—', lbl: 'Height cm' },
            { val: profile?.weight || '—', lbl: 'Weight kg' },
            { val: profile?.age || '—', lbl: 'Age' },
            { val: profile?.targetWeight || '—', lbl: 'Target kg' },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="pf-body-item"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="pf-body-val">{item.val}</span>
              <span className="pf-body-lbl">{item.lbl}</span>
            </motion.div>
          ))}
        </div>

        {bmi && (
          <motion.div
            className={`pf-bmi ${bmi.status.toLowerCase()}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="pf-bmi-left">
              <span className="pf-bmi-lbl">BMI</span>
              <span className="pf-bmi-val">{bmi.value}</span>
            </div>
            <span className="pf-bmi-status">{bmi.status}</span>
          </motion.div>
        )}

        {profile?.targetWeight && profile?.weight && (
          <div className="pf-goal-prog">
            <div className="pf-goal-prog-top">
              <span className="pf-goal-prog-lbl">GOAL PROGRESS</span>
              <span className="pf-goal-prog-pct">{Math.round(goalProgress)}%</span>
            </div>
            <div className="pf-goal-prog-track">
              <motion.div
                className="pf-goal-prog-fill"
                initial={{ width: 0 }}
                animate={{ width: `${goalProgress}%` }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
            <p className="pf-goal-prog-text">{profile.weight}kg → {profile.targetWeight}kg</p>
          </div>
        )}
      </motion.div>

      {/* ===== ACHIEVEMENTS ===== */}
      <motion.div className="pf-card" {...fadeUp(0.3)}>
        <p className="pf-card-title">ACHIEVEMENTS</p>
        <div className="pf-badges-grid">
          {BADGES.map((badge, i) => {
            const unlocked = !!getUnlockedBadges().find(b => b.id === badge.id)
            return <BadgeItem key={badge.id} badge={badge} unlocked={unlocked} index={i} />
          })}
        </div>
      </motion.div>

      {/* ===== PREFERENCES ===== */}
      <motion.div className="pf-card" {...fadeUp(0.35)}>
        <p className="pf-card-title">PREFERENCES</p>
        {[
          { label: 'Equipment', value: profile?.equipment || 'Both' },
          { label: 'Fitness Level', value: profile?.fitnessLevel || 'Beginner' },
        ].map((item, i) => (
          <div key={i} className="pf-pref-row">
            <span className="pf-pref-lbl">{item.label}</span>
            <span className="pf-pref-val">{item.value}</span>
          </div>
        ))}
        <div className="pf-pref-row">
          <span className="pf-pref-lbl">Preferred Days</span>
          <div className="pf-pref-days">
            {WORKOUT_DAYS.map(day => (
              <span
                key={day}
                className={`pf-pref-day ${profile?.preferredDays?.includes(day) ? 'active' : ''}`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ===== SETTINGS ===== */}
      <motion.div className="pf-card" {...fadeUp(0.4)}>
        <p className="pf-card-title">SETTINGS</p>

        <div className="pf-settings-row">
          <div className="pf-settings-left">
            <div className="pf-settings-icon-wrap"><Bell size={15} /></div>
            <span className="pf-settings-lbl">Notifications</span>
          </div>
          <motion.div
            className={`pf-toggle ${profile?.notifications ? 'on' : 'off'}`}
            onClick={() => {
              const updated = { ...profile, notifications: !profile?.notifications }
              setProfile(updated)
              setEditData(updated)
            }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="pf-toggle-thumb"
              animate={{ x: profile?.notifications ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.div>
        </div>

        <motion.div
          className="pf-settings-row"
          onClick={() => setShowEdit(true)}
          whileTap={{ scale: 0.98 }}
        >
          <div className="pf-settings-left">
            <div className="pf-settings-icon-wrap"><Pencil size={15} /></div>
            <span className="pf-settings-lbl">Edit Profile</span>
          </div>
          <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
        </motion.div>

        <motion.div
          className="pf-settings-row danger"
          onClick={handleLogout}
          whileTap={{ scale: 0.98 }}
        >
          <div className="pf-settings-left">
            <div className="pf-settings-icon-wrap danger"><LogOut size={15} /></div>
            <span className="pf-settings-lbl danger">Logout</span>
          </div>
          <ChevronRight size={16} color="rgba(255,107,107,0.4)" />
        </motion.div>
      </motion.div>

      {/* ===== EDIT BOTTOM SHEET ===== */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            className="pf-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEdit(false)}
          >
            <motion.div
              className="pf-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="pf-sheet-handle" />

              <div className="pf-sheet-header">
                <h3 className="pf-sheet-title">EDIT PROFILE</h3>
                <motion.button
                  className="pf-sheet-close"
                  onClick={() => setShowEdit(false)}
                  whileTap={{ scale: 0.88 }}
                >
                  <X size={14} />
                </motion.button>
              </div>

              <div className="pf-form">

                {/* ✅ AVATAR PICKER */}
                <div className="pf-field">
                  <label>Choose Avatar</label>
                  <div className="pf-avatar-picker">
                    {AVATARS.map(avatar => (
                      <motion.div
                        key={avatar.id}
                        className={`pf-avatar-option ${editData.avatarId === avatar.id ? 'selected' : ''}`}
                        onClick={() => setEditData({ ...editData, avatarId: avatar.id })}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.08 }}
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.id}
                          className="pf-avatar-option-img"
                        />
                        {editData.avatarId === avatar.id && (
                          <motion.div
                            className="pf-avatar-option-check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            <Check size={10} color="white" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* NAME */}
                <div className="pf-field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Your name"
                  />
                </div>

                {/* FITNESS LEVEL */}
                <div className="pf-field">
                  <label>Fitness Level</label>
                  <div className="pf-options">
                    {FITNESS_LEVELS.map(level => (
                      <motion.button
                        key={level}
                        className={`pf-option ${editData.fitnessLevel === level ? 'active' : ''}`}
                        onClick={() => setEditData({ ...editData, fitnessLevel: level })}
                        whileTap={{ scale: 0.92 }}
                      >{level}</motion.button>
                    ))}
                  </div>
                </div>

                {/* GOAL */}
                <div className="pf-field">
                  <label>Main Goal</label>
                  <div className="pf-options">
                    {GOALS.map(goal => (
                      <motion.button
                        key={goal}
                        className={`pf-option ${editData.goal === goal ? 'active' : ''}`}
                        onClick={() => setEditData({ ...editData, goal: goal })}
                        whileTap={{ scale: 0.92 }}
                      >{goal}</motion.button>
                    ))}
                  </div>
                </div>

                {/* HEIGHT & WEIGHT */}
                <div className="pf-field-row">
                  <div className="pf-field">
                    <label>Height (cm)</label>
                    <input
                      type="number"
                      value={editData.height || ''}
                      onChange={e => setEditData({ ...editData, height: e.target.value })}
                      placeholder="170"
                    />
                  </div>
                  <div className="pf-field">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      value={editData.weight || ''}
                      onChange={e => setEditData({ ...editData, weight: e.target.value })}
                      placeholder="70"
                    />
                  </div>
                </div>

                {/* AGE & TARGET */}
                <div className="pf-field-row">
                  <div className="pf-field">
                    <label>Age</label>
                    <input
                      type="number"
                      value={editData.age || ''}
                      onChange={e => setEditData({ ...editData, age: e.target.value })}
                      placeholder="25"
                    />
                  </div>
                  <div className="pf-field">
                    <label>Target Weight (kg)</label>
                    <input
                      type="number"
                      value={editData.targetWeight || ''}
                      onChange={e => setEditData({ ...editData, targetWeight: e.target.value })}
                      placeholder="65"
                    />
                  </div>
                </div>

                {/* EQUIPMENT */}
                <div className="pf-field">
                  <label>Equipment</label>
                  <div className="pf-options">
                    {EQUIPMENT.map(eq => (
                      <motion.button
                        key={eq}
                        className={`pf-option ${editData.equipment === eq ? 'active' : ''}`}
                        onClick={() => setEditData({ ...editData, equipment: eq })}
                        whileTap={{ scale: 0.92 }}
                      >{eq}</motion.button>
                    ))}
                  </div>
                </div>

                {/* PREFERRED DAYS */}
                <div className="pf-field">
                  <label>Preferred Days</label>
                  <div className="pf-days">
                    {WORKOUT_DAYS.map(day => (
                      <motion.button
                        key={day}
                        className={`pf-day ${editData.preferredDays?.includes(day) ? 'active' : ''}`}
                        onClick={() => {
                          const days = editData.preferredDays || []
                          setEditData({
                            ...editData,
                            preferredDays: days.includes(day)
                              ? days.filter(d => d !== day)
                              : [...days, day]
                          })
                        }}
                        whileTap={{ scale: 0.9 }}
                      >{day}</motion.button>
                    ))}
                  </div>
                </div>

                {/* SAVE */}
                <motion.button
                  className={`pf-save-btn ${saveSuccess ? 'success' : ''}`}
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {saving ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Zap size={16} />
                    </motion.div>
                  ) : saveSuccess ? (
                    <><Check size={16} /> SAVED!</>
                  ) : 'SAVE CHANGES'}
                </motion.button>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default Profile