import { useContext, useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext } from './context/AuthContext'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from './firebase/config'
import Layout from './components/Layout'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import Dashboard from './pages/Dashboard/Dashboard'
import Workouts from './pages/Workouts/Workouts'
import Plans from './pages/Plans/Plans'
import Stats from './pages/Stats/Stats'
import BodyMap from './pages/BodyMap/BodyMap'
import Profile from './pages/Profile/Profile'
import AIBot from './components/AIBot'

function App() {
  const { user, loading } = useContext(AuthContext)
  const [workouts, setWorkouts] = useState([])
  const [profile, setProfile] = useState({ goal: '', level: '', body: {} })

  useEffect(() => {
    if (!user) return
    async function load() {
      const q = query(collection(db, 'workouts'), where('userId', '==', user.uid))
      const snap = await getDocs(q)
      setWorkouts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))

      const pSnap = await getDoc(doc(db, 'profiles', user.uid))
      if (pSnap.exists()) setProfile(pSnap.data())
    }
    load()
  }, [user])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-base)',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Nunito, sans-serif',
          fontSize: '1.4rem',
          fontWeight: '900',
          color: 'white',
          boxShadow: '0 8px 24px rgba(255,107,107,0.4)',
          animation: 'pulse 1.5s ease infinite'
        }}>F</div>
        <p style={{
          fontFamily: 'Space Grotesk, sans-serif',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          fontWeight: '600'
        }}>Loading FitLog...</p>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        {/* Auth Routes */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" />}
        />
        <Route
          path="/signup"
          element={!user ? <Signup /> : <Navigate to="/" />}
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={user ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="plans" element={<Plans />} />
          <Route path="stats" element={<Stats />} />
          <Route path="bodymap" element={<BodyMap />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>

      {/* AIBot - global, hidden on /profile */}
      {user && <AIBot workouts={workouts} profile={profile} />}
    </HashRouter>
  )
}

export default App