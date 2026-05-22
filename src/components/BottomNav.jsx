import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './BottomNav.css'

const navItems = [
  {
    path: '/',
    label: 'Home',
    icon: ({ isActive }) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <motion.path
          d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { pathLength: [0.8, 1] } : {}}
          transition={{ duration: 0.4 }}
        />
        <motion.polyline
          points="9 22 9 12 15 12 15 22"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { pathLength: [0, 1] } : {}}
          transition={{ duration: 0.3, delay: 0.1 }}
        />
      </motion.svg>
    )
  },
  {
    path: '/workouts',
    label: 'Workout',
    icon: ({ isActive }) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isActive ? { rotate: [-8, 8, -8, 0] } : { rotate: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <motion.path d="M6.5 6.5h11" stroke="currentColor" strokeWidth={isActive ? 2 : 1.6} />
        <motion.path d="M6.5 17.5h11" stroke="currentColor" strokeWidth={isActive ? 2 : 1.6} />
        <motion.path
          d="M3 12h18"
          stroke="currentColor"
          strokeWidth={isActive ? 2.5 : 1.6}
          animate={isActive ? { scaleX: [0.8, 1.05, 1] } : {}}
          transition={{ duration: 0.4 }}
          style={{ transformOrigin: 'center' }}
        />
        <motion.path d="M7 3l-4 9 4 9" stroke="currentColor" strokeWidth={isActive ? 2 : 1.6} />
        <motion.path d="M17 3l4 9-4 9" stroke="currentColor" strokeWidth={isActive ? 2 : 1.6} />
      </motion.svg>
    )
  },
  {
    path: '/plans',
    label: 'Plans',
    icon: ({ isActive }) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isActive ? { y: [-2, 0] } : { y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <motion.rect
          x="3" y="4" width="18" height="18" rx="2" ry="2"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { pathLength: [0.5, 1] } : {}}
          transition={{ duration: 0.4 }}
        />
        <motion.line
          x1="16" y1="2" x2="16" y2="6"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { scaleY: [0, 1] } : {}}
          transition={{ duration: 0.3 }}
          style={{ transformOrigin: 'center' }}
        />
        <motion.line
          x1="8" y1="2" x2="8" y2="6"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { scaleY: [0, 1] } : {}}
          transition={{ duration: 0.3, delay: 0.05 }}
          style={{ transformOrigin: 'center' }}
        />
        <motion.line
          x1="3" y1="10" x2="21" y2="10"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { scaleX: [0, 1] } : {}}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{ transformOrigin: 'center' }}
        />
      </motion.svg>
    )
  },
  {
    path: '/stats',
    label: 'Stats',
    icon: ({ isActive }) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.line
          x1="6" y1="20" x2="6" y2="14"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { scaleY: [0.3, 1.1, 1] } : { scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0 }}
          style={{ transformOrigin: 'bottom' }}
        />
        <motion.line
          x1="12" y1="20" x2="12" y2="4"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { scaleY: [0.3, 1.1, 1] } : { scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          style={{ transformOrigin: 'bottom' }}
        />
        <motion.line
          x1="18" y1="20" x2="18" y2="10"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { scaleY: [0.3, 1.1, 1] } : { scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          style={{ transformOrigin: 'bottom' }}
        />
      </motion.svg>
    )
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: ({ isActive }) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.circle
          cx="12" cy="7" r="4"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ transformOrigin: 'center' }}
        />
        <motion.path
          d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth={isActive ? 2 : 1.6}
          animate={isActive ? { pathLength: [0, 1] } : {}}
          transition={{ duration: 0.4, delay: 0.1 }}
        />
      </motion.svg>
    )
  },
]

function BottomNav() {
  return (
    <motion.nav
      className="bottom-nav"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 260, damping: 28 }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          {({ isActive }) => (
            <>
              {/* Active background pill */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="nav-active-bg"
                    layoutId="nav-active-bg"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              {/* Top indicator bar - FIXED */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="nav-dot"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    exit={{ scaleX: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    style={{
                      position: 'absolute',
                      top: -1,
                      left: '50%',
                      marginLeft: '-12px',
                      transformOrigin: 'center',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.span
                className="nav-icon"
                animate={isActive ? { y: -3, scale: 1.15 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {item.icon({ isActive })}
              </motion.span>

              {/* Label */}
              <motion.span
                className="nav-label"
                animate={isActive ? { y: -1, opacity: 1 } : { y: 0, opacity: 0.4 }}
                transition={{ duration: 0.25 }}
              >
                {item.label}
              </motion.span>
            </>
          )}
        </NavLink>
      ))}
    </motion.nav>
  )
}

export default BottomNav