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
  'Forearms', 'Core', 'Legs', 'Glutes', 'Calves', 'Full Body', 'Cardio', 'Rest'
]

const defaultSchedule = () =>
  FULL_DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {})

function Plans() {
  const { user } = useContext(AuthContext)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [planName, setPlanName] = useState('')
  const [schedule, setSchedule] = useState(defaultSchedule())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    if (!user) return
    setLoading(true)
    try {
      const q = query(collection(db, 'plans'), where('userId', '==', user.uid))
      const snapshot = await getDocs(q)
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const toggleMuscle = (day, muscle) => {
    setSchedule(prev => {
      const current = prev[day] || []
      if (muscle === 'Rest') return { ...prev, [day]: ['Rest'] }
      if (muscle === 'Cardio') return { ...prev, [day]: ['Cardio'] }
      const filtered = current.filter(m => m !== 'Rest' && m !== 'Cardio')
      return {
        ...prev,
        [day]: filtered.includes(muscle)
          ? filtered.filter(m => m !== muscle)
          : [...filtered, muscle]
      }
    })
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
      console.error(err)
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
    } catch (err) {
      console.error(err)
    }
  }

  const deletePlan = async (planId) => {
    try {
      await deleteDoc(doc(db, 'plans', planId))
      await fetchPlans()
    } catch (err) {
      console.error(err)
    }
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
    return plan.schedule?.[today] || []
  }

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
              <div className="day-label">
                <span className="day-short">{DAYS[i]}</span>
                <span className="day-muscles-preview">
                  {schedule[day]?.length > 0
                    ? schedule[day].join(' + ')
                    : 'Not set'}
                </span>
              </div>
              <div className="muscle-chips">
                {MUSCLE_OPTIONS.map(muscle => (
                  <button
                    key={muscle}
                    className={`muscle-chip ${schedule[day]?.includes(muscle) ? 'active' : ''} ${muscle === 'Rest' ? 'rest' : ''} ${muscle === 'Cardio' ? 'cardio' : ''}`}
                    onClick={() => toggleMuscle(day, muscle)}
                  >
                    {muscle}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="plans-page">
      {/* Header */}
      <div className="plans-header">
        <h1>My Plans</h1>
        <button className="new-plan-btn" onClick={() => setShowCreate(true)}>
          + New
        </button>
      </div>

      {/* Plans List */}
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
          {plans.map(plan => (
            <div key={plan.id} className={`plan-card ${plan.isActive ? 'active' : ''}`}>

              {/* Plan Header */}
              <div className="plan-card-header">
                <div>
                  <h3 className="plan-name">{plan.name}</h3>
                  {plan.isActive && (
                    <span className="active-badge">Active</span>
                  )}
                </div>
                <div className="plan-actions">
                  <button className="edit-btn" onClick={() => openEdit(plan)}>Edit</button>
                  <button className="delete-btn" onClick={() => deletePlan(plan.id)}>Delete</button>
                </div>
              </div>

              {/* Today's focus */}
              <div className="today-focus">
                <span className="focus-label">Today →</span>
                <span className="focus-muscles">
                  {getTodayMuscles(plan).length > 0
                    ? getTodayMuscles(plan).join(' + ')
                    : 'Not set'}
                </span>
              </div>

              {/* Week overview */}
              <div className="week-overview">
                {FULL_DAYS.map((day, i) => {
                  const muscles = plan.schedule?.[day] || []
                  const isRest = muscles.includes('Rest')
                  const isCardio = muscles.includes('Cardio')
                  const isToday = (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) === i
                  return (
                    <div key={day} className={`day-dot ${isToday ? 'today' : ''}`}>
                      <div className={`dot ${isRest ? 'rest' : isCardio ? 'cardio' : muscles.length > 0 ? 'active' : 'empty'}`} />
                      <span className="dot-label">{DAYS[i]}</span>
                    </div>
                  )
                })}
              </div>

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
          ))}
        </div>
      )}
    </div>
  )
}

export default Plans