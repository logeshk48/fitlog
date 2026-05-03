import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import Workouts from './pages/Workouts/Workouts'
import Plans from './pages/Plans/Plans'
import Stats from './pages/Stats/Stats'
import BodyMap from './pages/BodyMap/BodyMap'
import Profile from './pages/Profile/Profile'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
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