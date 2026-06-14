import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import Home from './pages/Home'
import Recording from './pages/Recording'
import Minutes from './pages/Minutes'
import Tasks from './pages/Tasks'
import Resources from './pages/Resources'
import { useAppStore } from './store'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const setMeetings = useAppStore(s => s.setMeetings)
  const setTasks = useAppStore(s => s.setTasks)
  const setParticipants = useAppStore(s => s.setParticipants)

  useEffect(() => {
    ;(async () => {
      try {
        const [m, t, p] = await Promise.all([
          window.api.meetings.getAll(),
          window.api.tasks.getAll(),
          window.api.participants.getAll()
        ])
        setMeetings(m)
        setTasks(t)
        setParticipants(p as any)
        if (m.length > 0) {
          useAppStore.getState().setCurrentMeetingId(m[0].id)
        }
        await useAppStore.getState().initLockState()
      } catch (e) {
        console.error('Load data error:', e)
      }
    })()
  }, [])

  const showSidebar = !location.pathname.startsWith('/recording/')

  return (
    <div className="h-full flex bg-slate-50">
      {showSidebar && <Sidebar />}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/recording/:meetingId" element={<Recording />} />
          <Route path="/minutes/:meetingId" element={<Minutes />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
