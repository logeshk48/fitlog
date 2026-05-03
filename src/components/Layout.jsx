import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import './Layout.css'

function Layout() {
  return (
    <div className="app-layout">
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default Layout