import { NavLink, useNavigate } from 'react-router-dom'
import {
  Calendar, Mic, FileText, CheckSquare, FolderOpen, Users,
  Sparkles, Settings, HelpCircle
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/utils'

const navItems = [
  { to: '/home', icon: Calendar, label: '会议总览' },
  { to: '/tasks', icon: CheckSquare, label: '任务中心' },
  { to: '/resources', icon: FolderOpen, label: '资料管理' }
]

export default function Sidebar() {
  const navigate = useNavigate()
  const currentMeetingId = useAppStore(s => s.currentMeetingId)
  const meetings = useAppStore(s => s.meetings)

  const gotoRecording = () => {
    if (currentMeetingId) {
      navigate(`/recording/${currentMeetingId}`)
    }
  }
  const gotoMinutes = () => {
    if (currentMeetingId) {
      navigate(`/minutes/${currentMeetingId}`)
    }
  }

  const currentMeeting = meetings.find(m => m.id === currentMeetingId)

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
      <div className="h-16 px-5 flex items-center gap-2 border-b border-slate-100 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <div className="font-semibold text-slate-800 leading-tight">AI 会议助理</div>
          <div className="text-xs text-slate-400">Meeting Assistant</div>
        </div>
      </div>

      {currentMeeting && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <Users size={12} /> 当前会议
          </div>
          <div className="text-sm font-medium text-slate-800 truncate" title={currentMeeting.title}>
            {currentMeeting.title}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={gotoRecording}
              className="flex-1 px-2 py-1.5 rounded-md text-xs bg-primary-50 text-primary-700 font-medium hover:bg-primary-100 transition"
            >
              <span className="inline-flex items-center gap-1"><Mic size={12} /> 录音</span>
            </button>
            <button
              onClick={gotoMinutes}
              className="flex-1 px-2 py-1.5 rounded-md text-xs bg-accent-50 text-accent-600 font-medium hover:bg-accent-100 transition"
            >
              <span className="inline-flex items-center gap-1"><FileText size={12} /> 纪要</span>
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="text-xs text-slate-400 px-3 py-2">导航</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn('nav-item', isActive ? 'nav-item-active' : 'nav-item-inactive')
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="text-xs text-slate-400 px-3 py-2 mt-4">快捷会议</div>
        {meetings.slice(0, 6).map(m => (
          <button
            key={m.id}
            onClick={() => {
              useAppStore.getState().setCurrentMeetingId(m.id)
              navigate('/home')
            }}
            className={cn(
              'w-full text-left nav-item',
              m.id === currentMeetingId ? 'nav-item-active' : 'nav-item-inactive'
            )}
          >
            <Calendar size={18} />
            <span className="flex-1 truncate">{m.title}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-1">
        <button className="nav-item w-full nav-item-inactive">
          <Settings size={18} />
          <span>设置</span>
        </button>
        <button className="nav-item w-full nav-item-inactive">
          <HelpCircle size={18} />
          <span>帮助中心</span>
        </button>
      </div>
    </aside>
  )
}
