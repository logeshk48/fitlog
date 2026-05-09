import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { db } from '../../firebase'
import {
  collection, addDoc, getDocs, updateDoc,
  deleteDoc, doc, query, where, serverTimestamp
} from 'firebase/firestore'
import './Plans.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MUSCLE_OPTIONS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Core', 'Legs', 'Glutes', 'Calves', 'Full Body', 'Cardio'
]

const defaultSchedule = () =>
  FULL_DAYS.reduce((acc, day) => ({
    ...acc,
    [day]: { primary: '', secondary: [], isRest: false }
  }), {})

function Plans() {
  const { user } = useContext(AuthContext)
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
      const current = prev[day]?.secondary || []
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
      [day]: {
        primary: '',
        secondary: [],
        isRest: !prev[day]?.isRest
      }
    }))
  }

  const savePlan = async () => {
    if (!planName.trim()) return
    setSaving(true)
    try {
      if (editPlan) {
        await updateDoc(doc(db, 'plans', editPlan.id), {
          name: planName,
          schedule,
          updatedAt: serverTimestamp()
        })
      } else {
        await addDoc(collection(db, 'plans'), {
          userId: user.uid,
          name: planName,
          schedule,
          isActive: plans.length === 0,
          createdAt: serverTimestamp()
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
        await updateDoc(doc(db, 'plans', plan.id), {
          isActive: plan.id === planId
        })
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
    const today = FULL_DAYS[adjustedIndex]
    return plan.schedule?.[today] || { primary: '', secondary: [], isRest: false }
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
        <div className="plans-header">
          <button className="back-btn" onClick={resetForm}>←</button>
          <h1>{editPlan ? 'Edit Plan' : 'New Plan'}</h1>
          <button
            className="save-plan-btn"
            onClick={savePlan}
            disabled={saving || !planName.trim()}
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>

        {/* Plan Name */}
        <div className="plan-name-input">
          <input
            type="text"
            placeholder="Plan name (e.g. My Bulk Split)"
            value={planName}
            onChange={e => setPlanName(e.target.value)}
            className="name-input"
          />
        </div>

        {/* Schedule */}
        <div className="schedule-builder">
          {FULL_DAYS.map((day, i) => (
            <div key={day} className="day-block">

              {/* Day header */}
              <div className="day-label">
                <span className="day-short">{DAYS[i]}</span>
                <span className="day-muscles-preview">{getDayPreview(day)}</span>
              </div>

              {/* Rest toggle */}
              <button
                className={`rest-toggle ${schedule[day]?.isRest ? 'active' : ''}`}
                onClick={() => toggleRest(day)}
              >
                {schedule[day]?.isRest ? '✓ Rest Day' : 'Mark as Rest'}
              </button>

              {!schedule[day]?.isRest && (
                <>
                  {/* Primary */}
                  <div className="muscle-section-label">Primary Muscle</div>
                  <div className="muscle-chips">
                    {MUSCLE_OPTIONS.map(muscle => (
                      <button
                        key={muscle}
                        className={`muscle-chip primary-chip ${schedule[day]?.primary === muscle ? 'active' : ''}`}
                        onClick={() => togglePrimary(day, muscle)}
                      >
                        {muscle}
                      </button>
                    ))}
                  </div>

                  {/* Secondary */}
                  <div className="muscle-section-label">Secondary Muscles</div>
                  <div className="muscle-chips">
                    {MUSCLE_OPTIONS
                      .filter(m => m !== schedule[day]?.primary)
                      .map(muscle => (
                        <button
                          key={muscle}
                          className={`muscle-chip secondary-chip ${schedule[day]?.secondary?.includes(muscle) ? 'active' : ''}`}
                          onClick={() => toggleSecondary(day, muscle)}
                        >
                          {muscle}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
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
      <div className="plans-header">
        <h1>My Plans</h1>
        <button className="new-plan-btn" onClick={() => setShowCreate(true)}>
          + New
        </button>
      </div>

      {loading ? (
        <div className="plans-loading">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="plans-empty">
          <div className="empty-icon">📅</div>
          <h3>No plans yet</h3>
          <p>Create your first workout plan!</p>
          <button className="create-first-btn" onClick={() => setShowCreate(true)}>
            Create Plan
          </button>
        </div>
      ) : (
        <div className="plans-list">
          {[...plans]
            .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
            .map(plan => {
              const today = getTodayMuscles(plan)
              const isExpanded = expandedPlan === plan.id
              return (
                <div
                  key={plan.id}
                  className={`plan-card ${plan.isActive ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}
                >
                  {/* Header - clickable to expand */}
                  <div
                    className="plan-card-header"
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  >
                    <div>
                      <h3 className="plan-name">{plan.name}</h3>
                      {plan.isActive && (
                        <span className="active-badge">● Active</span>
                      )}
                    </div>
                    <div className="plan-actions" onClick={e => e.stopPropagation()}>
                      <button className="edit-btn" onClick={() => openEdit(plan)}>Edit</button>
                      <button className="delete-btn" onClick={() => deletePlan(plan.id)}>Delete</button>
                    </div>
                  </div>

                  {/* Today's focus */}
                  <div className="today-focus">
                    <span className="focus-label">Today →</span>
                    <div className="focus-content">
                      {today.isRest ? (
                        <span className="focus-rest">Rest Day</span>
                      ) : today.primary ? (
                        <>
                          <span className="focus-primary">{today.primary}</span>
                          {today.secondary?.length > 0 && (
                            <span className="focus-secondary">
                              + {today.secondary.join(', ')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="focus-empty">Not set</span>
                      )}
                    </div>
                  </div>

                  {/* Week overview */}
                  <div className="week-overview">
                    {FULL_DAYS.map((day, i) => {
                      const d = plan.schedule?.[day]
                      const isRest = d?.isRest
                      const hasWorkout = d?.primary
                      const isToday = todayIndex === i
                      return (
                        <div key={day} className={`day-dot ${isToday ? 'today' : ''}`}>
                          <div className={`dot ${isRest ? 'rest' : hasWorkout ? 'active' : 'empty'}`} />
                          <span className="dot-label">{DAYS[i]}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Expanded Schedule */}
                  {isExpanded && (
                    <div className="expanded-schedule">
                      {FULL_DAYS.map((day, i) => {
                        const d = plan.schedule?.[day]
                        const isToday = todayIndex === i
                        return (
                          <div key={day} className={`schedule-row ${isToday ? 'today-row' : ''}`}>
                            <span className="schedule-day">{DAYS[i]}</span>
                            <div className="schedule-muscles">
                              {d?.isRest ? (
                                <span className="schedule-rest">Rest</span>
                              ) : d?.primary ? (
                                <>
                                  <span className="schedule-primary">{d.primary}</span>
                                  {d.secondary?.length > 0 && (
                                    <span className="schedule-secondary">
                                      + {d.secondary.join(', ')}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="schedule-empty">—</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Set Active */}
                  {!plan.isActive && (
                    <button
                      className="set-active-btn"
                      onClick={() => setActive(plan.id)}
                    >
                      Set as Active
                    </button>
                  )}

                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default Plans