import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import appBg from '../assets/app-bg.png'
import './Layout.css'

function Layout() {
  return (
    <div
      className="app-layout"
      style={{ '--app-bg': `url(${appBg})` }}
    >
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default Layout