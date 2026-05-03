import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from './context/AuthContext'
import Layout from './components/Layout'

// Pages
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import Dashboard from './pages/Dashboard/Dashboard'
import Workouts from './pages/Workouts/Workouts'
import Plans from './pages/Plans/Plans'
import Stats from './pages/Stats/Stats'
import BodyMap from './pages/BodyMap/BodyMap'
import Profile from './pages/Profile/Profile'

function App() {
  const { user, loading } = useContext(AuthContext)

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-heading)',
        fontSize: '1.5rem'
      }}>
        💪 Loading...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />

        {/* Protected Routes */}
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="plans" element={<Plans />} />
          <Route path="stats" element={<Stats />} />
          <Route path="bodymap" element={<BodyMap />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App