import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import {
  collection, addDoc, getDocs, updateDoc,
  deleteDoc, doc, query, where, serverTimestamp
} from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Check, Trash2, Pencil, Calendar, ChevronDown, Zap, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './Plans.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MUSCLE_OPTIONS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Core', 'Legs', 'Glutes', 'Calves', 'Full Body', 'Cardio'
]

const MUSCLE_COLORS = {
  'Chest': '#FF6B6B', 'Back': '#4ECDC4', 'Shoulders': '#A855F7',
  'Biceps': '#3B82F6', 'Triceps': '#F97316', 'Forearms': '#FFE66D',
  'Core': '#22C55E', 'Legs': '#EC4899', 'Glutes': '#FF8E53',
  'Calves': '#4d9fff', 'Full Body': '#FFE66D', 'Cardio': '#FF6B6B'
}

const defaultSchedule = () =>
  FULL_DAYS.reduce((acc, day) => ({
    ...acc,
    [day]: { primary: '', secondary: [], isRest: false }
  }), {})

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }
})

// ================================
// MUSCLE COVERAGE BAR
// ================================
function MuscleCoverageBar({ schedule }) {
  const allMuscles = new Set()
  FULL_DAYS.forEach(day => {
    const d = schedule?.[day]
    if (!d?.isRest && d?.primary) {
      allMuscles.add(d.primary)
      d.secondary?.forEach(m => allMuscles.add(m))
    }
  })
  const muscles = [...allMuscles].slice(0, 8)
  const workoutDays = FULL_DAYS.filter(day => !schedule?.[day]?.isRest && schedule?.[day]?.primary).length
  const restDays = FULL_DAYS.filter(day => schedule?.[day]?.isRest).length

  return (
    <div className="pl-coverage">
      <div className="pl-coverage-bar">
        {muscles.map((muscle, i) => (
          <motion.div
            key={muscle}
            className="pl-coverage-seg"
            style={{ background: MUSCLE_COLORS[muscle] || '#666' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            title={muscle}
          />
        ))}
        {muscles.length === 0 && (
          <div className="pl-coverage-empty-bar" />
        )}
      </div>
      <div className="pl-coverage-stats">
        <span className="pl-coverage-stat">
          <span style={{ color: '#22C55E' }}>{workoutDays}</span> workout days
        </span>
        <span className="pl-coverage-dot" />
        <span className="pl-coverage-stat">
          <span style={{ color: '#4ECDC4' }}>{restDays}</span> rest days
        </span>
        <span className="pl-coverage-dot" />
        <span className="pl-coverage-stat">
          <span style={{ color: '#FF6B6B' }}>{muscles.length}</span> muscles
        </span>
      </div>
    </div>
  )
}

// ================================
// DAY PILLS ROW
// ================================
function DayPillsRow({ schedule, todayIndex }) {
  return (
    <div className="pl-day-pills">
      {FULL_DAYS.map((day, i) => {
        const d = schedule?.[day]
        const isToday = todayIndex === i
        const color = d?.primary ? MUSCLE_COLORS[d.primary] : null
        const isRest = d?.isRest
        const hasWorkout = d?.primary && !isRest

        return (
          <motion.div
            key={day}
            className={`pl-day-pill ${isToday ? 'today' : ''} ${isRest ? 'rest' : ''} ${hasWorkout ? 'workout' : ''}`}
            style={hasWorkout ? {
              background: `${color}20`,
              borderColor: `${color}60`,
            } : {}}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.05 }}
          >
            <span className="pl-pill-day">{DAYS[i]}</span>
            <span
              className="pl-pill-muscle"
              style={hasWorkout ? { color: color } : {}}
            >
              {isRest ? 'REST' : d?.primary ? d.primary.slice(0, 4).toUpperCase() : '—'}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

function Plans() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [planName, setPlanName] = useState('')
  const [schedule, setSchedule] = useState(defaultSchedule())
  const [saving, setSaving] = useState(false)
  const [expandedPlan, setExpandedPlan] = useState(null)

  useEffect(() => { fetchPlans() }, [])

  const fetchPlans = async () => {
    if (!user) return
    setLoading(true)
    try {
      const q = query(collection(db, 'plans'), where('userId', '==', user.uid))
      const snapshot = await getDocs(q)
      setPlans(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const togglePrimary = (day, muscle) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        primary: prev[day]?.primary === muscle ? '' : muscle,
        secondary: prev[day]?.secondary || []
      }
    }))
  }

  const toggleSecondary = (day, muscle) => {
    setSchedule(prev => {
      const current = Array.isArray(prev[day]?.secondary) ? prev[day].secondary : []
      return {
        ...prev,
        [day]: {
          ...prev[day],
          secondary: current.includes(muscle)
            ? current.filter(m => m !== muscle)
            : [...current, muscle]
        }
      }
    })
  }

  const toggleRest = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { primary: '', secondary: [], isRest: !prev[day]?.isRest }
    }))
  }

  const savePlan = async () => {
    if (!planName.trim()) return
    setSaving(true)
    try {
      if (editPlan) {
        await updateDoc(doc(db, 'plans', editPlan.id), {
          name: planName, schedule, updatedAt: serverTimestamp()
        })
      } else {
        await addDoc(collection(db, 'plans'), {
          userId: user.uid, name: planName, schedule,
          isActive: plans.length === 0, createdAt: serverTimestamp()
        })
      }
      await fetchPlans()
      resetForm()
    } catch (err) {
      console.error('Save error:', err)
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  const setActive = async (planId) => {
    try {
      for (const plan of plans) {
        await updateDoc(doc(db, 'plans', plan.id), { isActive: plan.id === planId })
      }
      await fetchPlans()
    } catch (err) { console.error(err) }
  }

  const deletePlan = async (planId) => {
    if (!window.confirm('Delete this plan?')) return
    try {
      await deleteDoc(doc(db, 'plans', planId))
      await fetchPlans()
    } catch (err) { console.error(err) }
  }

  const openEdit = (plan) => {
    setEditPlan(plan)
    setPlanName(plan.name)
    setSchedule(plan.schedule || defaultSchedule())
    setShowCreate(true)
  }

  const resetForm = () => {
    setPlanName('')
    setSchedule(defaultSchedule())
    setEditPlan(null)
    setShowCreate(false)
  }

  const getTodayMuscles = (plan) => {
    const dayIndex = new Date().getDay()
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1
    const d = plan.schedule?.[FULL_DAYS[adjustedIndex]]
    return {
      primary: d?.primary || '',
      secondary: Array.isArray(d?.secondary) ? d.secondary : [],
      isRest: d?.isRest || false
    }
  }

  const getDayPreview = (day) => {
    const d = schedule[day]
    if (d?.isRest) return 'Rest Day'
    if (d?.primary) {
      const sec = d.secondary?.length > 0 ? ` + ${d.secondary.join(', ')}` : ''
      return `${d.primary}${sec}`
    }
    return 'Not set'
  }

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  // ================================
  // CREATE / EDIT SCREEN
  // ================================
  if (showCreate) {
    return (
      <div className="plans-page">
        <div className="pl-header">
          <motion.button className="pl-back-btn" onClick={resetForm} whileTap={{ scale: 0.9 }}>
            <ArrowLeft size={18} />
          </motion.button>
          <h1 className="pl-title">{editPlan ? 'EDIT PLAN' : 'NEW PLAN'}</h1>
          <motion.button
            className="pl-save-btn"
            onClick={savePlan}
            disabled={saving || !planName.trim()}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.04 }}
          >
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Zap size={14} />
              </motion.div>
            ) : (
              <><Check size={14} />SAVE</>
            )}
          </motion.button>
        </div>

        <motion.div className="pl-name-wrap" {...fadeUp(0.05)}>
          <input
            type="text"
            placeholder="Plan name (e.g. My Bulk Split)"
            value={planName}
            onChange={e => setPlanName(e.target.value)}
            className="pl-name-input"
          />
        </motion.div>

        {/* Coverage preview while building */}
        {planName && (
          <motion.div {...fadeUp(0.08)}>
            <MuscleCoverageBar schedule={schedule} />
          </motion.div>
        )}

        <div className="pl-schedule">
          {FULL_DAYS.map((day, i) => (
            <motion.div key={day} className="pl-day-block" {...fadeUp(0.05 + i * 0.04)}>
              <div className="pl-day-header">
                <div className="pl-day-left">
                  <span className="pl-day-short">{DAYS[i]}</span>
                  <span className="pl-day-preview">{getDayPreview(day)}</span>
                </div>
                <motion.button
                  className={`pl-rest-btn ${schedule[day]?.isRest ? 'active' : ''}`}
                  onClick={() => toggleRest(day)}
                  whileTap={{ scale: 0.92 }}
                >
                  {schedule[day]?.isRest ? <><Check size={11} /> Rest</> : 'Rest Day'}
                </motion.button>
              </div>

              <AnimatePresence>
                {!schedule[day]?.isRest && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="pl-muscle-label">PRIMARY</p>
                    <div className="pl-chips">
                      {MUSCLE_OPTIONS.map(muscle => {
                        const isActive = schedule[day]?.primary === muscle
                        const color = MUSCLE_COLORS[muscle]
                        return (
                          <motion.button
                            key={muscle}
                            className={`pl-chip pl-primary-chip ${isActive ? 'active' : ''}`}
                            style={isActive ? {
                              background: `${color}20`, borderColor: color,
                              color: color, boxShadow: `0 3px 12px ${color}30`
                            } : {}}
                            onClick={() => togglePrimary(day, muscle)}
                            whileTap={{ scale: 0.92 }}
                          >
                            {muscle}
                          </motion.button>
                        )
                      })}
                    </div>
                    <p className="pl-muscle-label">SECONDARY</p>
                    <div className="pl-chips">
                      {MUSCLE_OPTIONS.filter(m => m !== schedule[day]?.primary).map(muscle => {
                        const isActive = schedule[day]?.secondary?.includes(muscle)
                        const color = MUSCLE_COLORS[muscle]
                        return (
                          <motion.button
                            key={muscle}
                            className={`pl-chip pl-secondary-chip ${isActive ? 'active' : ''}`}
                            style={isActive ? {
                              background: `${color}15`, borderColor: `${color}60`, color: color,
                            } : {}}
                            onClick={() => toggleSecondary(day, muscle)}
                            whileTap={{ scale: 0.92 }}
                          >
                            {muscle}
                          </motion.button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // ================================
  // PLANS LIST SCREEN
  // ================================
  return (
    <div className="plans-page">
      <motion.div className="pl-header" {...fadeUp(0)}>
        <h1 className="pl-title">MY PLANS</h1>
        <motion.button
          className="pl-new-btn"
          onClick={() => setShowCreate(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={16} />NEW
        </motion.button>
      </motion.div>

      {loading && (
        <div className="pl-loading">
          {[1,2,3].map(i => (
            <motion.div
              key={i}
              className="pl-skeleton"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      )}

      {!loading && plans.length === 0 && (
        <motion.div className="pl-empty" {...fadeUp(0.1)}>
          <motion.div
            className="pl-empty-icon"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            <Calendar size={48} color="rgba(255,255,255,0.15)" />
          </motion.div>
          <h3 className="pl-empty-title">No plans yet</h3>
          <p className="pl-empty-sub">Create your first workout plan!</p>
          <motion.button
            className="pl-create-first-btn"
            onClick={() => setShowCreate(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Plus size={16} />CREATE PLAN
          </motion.button>
        </motion.div>
      )}

      {!loading && plans.length > 0 && (
        <div className="pl-list">
          {[...plans]
            .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
            .map((plan, idx) => {
              const today = getTodayMuscles(plan)
              const isExpanded = expandedPlan === plan.id
              const todayColor = today.primary ? MUSCLE_COLORS[today.primary] : null

              return (
                <motion.div
                  key={plan.id}
                  className={`pl-card ${plan.isActive ? 'active' : ''}`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={{ y: -2 }}
                >
                  {/* Active glow effect */}
                  {plan.isActive && (
                    <motion.div
                      className="pl-active-glow"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                  )}

                  <div className={`pl-card-bar ${plan.isActive ? 'active' : ''}`} />

                  {/* Header */}
                  <div
                    className="pl-card-header"
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  >
                    <div className="pl-card-header-left">
                      <h3 className="pl-plan-name">{plan.name}</h3>
                      {plan.isActive && (
                        <motion.span
                          className="pl-active-badge"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <Check size={10} /> ACTIVE
                        </motion.span>
                      )}
                    </div>
                    <div className="pl-card-actions" onClick={e => e.stopPropagation()}>
                      <motion.button className="pl-edit-btn" onClick={() => openEdit(plan)} whileTap={{ scale: 0.9 }}>
                        <Pencil size={13} />
                      </motion.button>
                      <motion.button className="pl-delete-btn" onClick={() => deletePlan(plan.id)} whileTap={{ scale: 0.9 }}>
                        <Trash2 size={13} />
                      </motion.button>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <ChevronDown size={16} color="rgba(255,255,255,0.3)" />
                      </motion.div>
                    </div>
                  </div>

                  {/* ✅ UPGRADE 1: Muscle Coverage Bar */}
                  <MuscleCoverageBar schedule={plan.schedule} />

                  {/* ✅ UPGRADE 2: Day Pills */}
                  <DayPillsRow schedule={plan.schedule} todayIndex={todayIndex} />

                  {/* ✅ UPGRADE 3: Quick Start Button (active plan only) */}
                  {plan.isActive && !today.isRest && today.primary && (
                    <motion.button
                      className="pl-quick-start-btn"
                      style={{
                        background: `linear-gradient(135deg, ${todayColor}, ${todayColor}99)`,
                        boxShadow: `0 8px 24px ${todayColor}40`
                      }}
                      onClick={() => navigate('/workouts', {
                        state: {
                          preselectedMuscle: today.primary,
                          preselectedSecondary: today.secondary || [],
                          preselectedEquipment: 'With Weight'
                        }
                      })}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      animate={{ boxShadow: [`0 8px 24px ${todayColor}40`, `0 8px 32px ${todayColor}70`, `0 8px 24px ${todayColor}40`] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <Play size={16} fill="white" />
                      START TODAY — {today.primary.toUpperCase()}
                      {today.secondary?.length > 0 && (
                        <span className="pl-quick-secondary">+ {today.secondary.join(', ')}</span>
                      )}
                    </motion.button>
                  )}

                  {plan.isActive && today.isRest && (
                    <div className="pl-rest-indicator">
                      <span className="pl-rest-z">Z</span>
                      <span>REST DAY — RECOVER WELL</span>
                    </div>
                  )}

                  {/* Expanded Schedule */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className="pl-expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {FULL_DAYS.map((day, i) => {
                          const d = plan.schedule?.[day]
                          const isToday = todayIndex === i
                          const color = d?.primary ? MUSCLE_COLORS[d.primary] : null
                          return (
                            <div key={day} className={`pl-schedule-row ${isToday ? 'today' : ''}`}>
                              <span className="pl-sched-day">{DAYS[i]}</span>
                              <div className="pl-sched-muscles">
                                {d?.isRest ? (
                                  <span className="pl-sched-rest">Rest</span>
                                ) : d?.primary ? (
                                  <>
                                    <span className="pl-sched-primary" style={{ color: color || '#fff' }}>
                                      {d.primary}
                                    </span>
                                    {d.secondary?.length > 0 && (
                                      <span className="pl-sched-secondary">+ {d.secondary.join(', ')}</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="pl-sched-empty">—</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!plan.isActive && (
                    <motion.button
                      className="pl-set-active-btn"
                      onClick={() => setActive(plan.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Zap size={14} />SET AS ACTIVE
                    </motion.button>
                  )}
                </motion.div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default Plans