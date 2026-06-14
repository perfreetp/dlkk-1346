import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Calendar, Clock, Users, MapPin,
  Play, FileText, ChevronRight, Video, Building, Radio,
  ChevronLeft, Filter, MoreVertical, Trash2, Lock, LockOpen,
  CheckCircle, CheckSquare
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn, formatDate, formatDateTime, formatTime, statusText, statusColor, avatarColor } from '@/utils'
import type { Meeting, Participant, MeetingType, MeetingStatus } from '@/types'
import MeetingFormModal from '@/components/MeetingFormModal'
import ParticipantsPanel from '@/components/ParticipantsPanel'

export default function Home() {
  const navigate = useNavigate()
  const meetings = useAppStore(s => s.meetings)
  const currentMeetingId = useAppStore(s => s.currentMeetingId)
  const setCurrentMeetingId = useAppStore(s => s.setCurrentMeetingId)
  const removeMeeting = useAppStore(s => s.removeMeeting)
  const updateMeetingStore = useAppStore(s => s.updateMeeting)
  const allParticipants = useAppStore(s => s.participants)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | MeetingType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | MeetingStatus>('all')
  const [showModal, setShowModal] = useState(false)
  const [calendarOffset, setCalendarOffset] = useState(0)
  const [lockPwdInput, setLockPwdInput] = useState<{ id: number; mode: 'lock' | 'unlock' } | null>(null)
  const [pwdValue, setPwdValue] = useState('')
  const [menuId, setMenuId] = useState<number | null>(null)

  const participants = useMemo(() => {
    const map: Record<number, Participant[]> = {}
    allParticipants.forEach(p => {
      if (!map[p.meetingId]) map[p.meetingId] = []
      map[p.meetingId].push(p)
    })
    return map
  }, [allParticipants])

  const filtered = meetings.filter(m => {
    if (search && !m.title.includes(search) && !(m.description || '').includes(search)) return false
    if (typeFilter !== 'all' && m.meetingType !== typeFilter) return false
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    return true
  })

  const today = new Date()
  today.setDate(today.getDate() + calendarOffset * 7)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekDays: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    weekDays.push(d)
  }

  const meetingsByDay: Record<string, Meeting[]> = {}
  meetings.forEach(m => {
    const d = new Date(m.startTime.replace(' ', 'T'))
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!meetingsByDay[key]) meetingsByDay[key] = []
    meetingsByDay[key].push(m)
  })

  const weekNames = ['日', '一', '二', '三', '四', '五', '六']

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此会议吗？相关数据将一并删除。')) return
    await window.api.meetings.delete(id)
    removeMeeting(id)
    if (currentMeetingId === id) {
      const rest = meetings.filter(m => m.id !== id)
      setCurrentMeetingId(rest[0]?.id ?? null)
    }
    setMenuId(null)
  }

  const toggleLock = (m: Meeting) => {
    setLockPwdInput({ id: m.id, mode: m.isLocked ? 'unlock' : 'lock' })
    setPwdValue(m.password || '')
    setMenuId(null)
  }

  const confirmLock = async () => {
    if (!lockPwdInput) return
    const m = meetings.find(x => x.id === lockPwdInput.id)
    if (!m) return
    const isLocking = lockPwdInput.mode === 'lock'
    if (isLocking && !pwdValue.trim()) {
      alert('请设置访问密码')
      return
    }
    if (!isLocking && pwdValue !== (m.password || '')) {
      alert('密码不正确')
      return
    }
    const updated = await window.api.meetings.update(m.id, {
      isLocked: isLocking ? 1 : 0,
      password: isLocking ? pwdValue.trim() : ''
    })
    updateMeetingStore(updated)
    setLockPwdInput(null)
    setPwdValue('')
  }

  const stats = {
    total: meetings.length,
    inProgress: meetings.filter(m => m.status === 'in_progress').length,
    completed: meetings.filter(m => m.status === 'completed').length,
    pendingTasks: useAppStore.getState().tasks.filter(t => t.status !== 'done').length
  }

  const typeIcon = (t: MeetingType) => {
    if (t === 'online') return <Radio size={14} />
    if (t === 'offline') return <Building size={14} />
    return <Video size={14} />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center gap-4 shrink-0">
        <div className="flex-1 max-w-xl relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索会议标题、描述..."
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
            <button
              onClick={() => setTypeFilter('all')}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition',
                typeFilter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
            >全部</button>
            <button
              onClick={() => setTypeFilter('online')}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition',
                typeFilter === 'online' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
            >线上</button>
            <button
              onClick={() => setTypeFilter('offline')}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition',
                typeFilter === 'offline' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
            >线下</button>
            <button
              onClick={() => setTypeFilter('hybrid')}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition',
                typeFilter === 'hybrid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
            >混合</button>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="select !w-32"
          >
            <option value="all">全部状态</option>
            <option value="scheduled">待开始</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> 新建会议
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="会议总数" value={stats.total} icon={Calendar} color="bg-blue-50 text-blue-600" />
            <StatCard label="进行中" value={stats.inProgress} icon={Play} color="bg-amber-50 text-amber-600" />
            <StatCard label="已完成" value={stats.completed} icon={CheckCircle} color="bg-green-50 text-green-600" />
            <StatCard label="待办任务" value={stats.pendingTasks} icon={CheckSquare} color="bg-purple-50 text-purple-600" />
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-primary-600" />
                <span className="font-semibold text-slate-800">本周日程</span>
                <span className="text-xs text-slate-400">
                  {formatDate(weekDays[0].toISOString())} ~ {formatDate(weekDays[6].toISOString())}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCalendarOffset(o => o - 1)} className="btn-ghost p-1.5 !px-1.5 !py-1">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setCalendarOffset(0)} className="btn-ghost text-xs">今天</button>
                <button onClick={() => setCalendarOffset(o => o + 1)} className="btn-ghost p-1.5 !px-1.5 !py-1">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-7 gap-2">
              {weekDays.map((d, idx) => {
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
                const list = meetingsByDay[key] || []
                const isToday = d.toDateString() === new Date().toDateString()
                return (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-lg border p-2 min-h-[110px] flex flex-col',
                      isToday ? 'border-primary-300 bg-primary-50/40' : 'border-slate-200 bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">周{weekNames[idx]}</span>
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                        isToday ? 'bg-primary-600 text-white' : 'text-slate-600'
                      )}>{d.getDate()}</span>
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {list.slice(0, 3).map(m => (
                        <button
                          key={m.id}
                          onClick={() => setCurrentMeetingId(m.id)}
                          className={cn(
                            'w-full text-left text-[11px] px-1.5 py-1 rounded truncate transition',
                            m.id === currentMeetingId
                              ? 'bg-primary-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          )}
                          title={m.title}
                        >
                          {formatTime(m.startTime)} {m.title}
                        </button>
                      ))}
                      {list.length > 3 && (
                        <div className="text-[10px] text-slate-400 px-1.5">+{list.length - 3} 更多</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-primary-600" />
                <span className="font-semibold text-slate-800">会议列表</span>
                <span className="tag bg-slate-100 text-slate-600">{filtered.length} 场</span>
              </div>
              <div className="flex items-center gap-1">
                <Filter size={14} className="text-slate-400" />
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">暂无会议，点击右上角新建</div>
              ) : filtered.map(m => {
                const parts = participants[m.id] || []
                const isCurrent = m.id === currentMeetingId
                return (
                  <div
                    key={m.id}
                    onClick={() => setCurrentMeetingId(m.id)}
                    className={cn(
                      'p-5 cursor-pointer transition hover:bg-slate-50 relative group',
                      isCurrent && 'bg-primary-50/60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800 truncate">{m.title}</h3>
                          {m.isLocked ? <Lock size={14} className="text-amber-500" /> : null}
                          <span className={cn('tag', statusColor(m.status))}>{statusText(m.status)}</span>
                          <span className={cn('tag', statusColor(m.meetingType))}>
                            <span className="inline-flex items-center gap-1">{typeIcon(m.meetingType)}{statusText(m.meetingType)}</span>
                          </span>
                        </div>
                        {m.description && (
                          <p className="text-sm text-slate-500 line-clamp-1 mb-2">{m.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} /> {formatDateTime(m.startTime)}
                          </span>
                          {m.endTime && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} /> 时长 {m.duration ? `${m.duration} 分钟` : '-'}
                            </span>
                          )}
                          {m.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} /> {m.location}
                            </span>
                          )}
                          {parts.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Users size={12} /> {parts.length} 人参会
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {parts.length > 0 && (
                          <div className="flex -space-x-1.5">
                            {parts.slice(0, 4).map(p => (
                              <div
                                key={p.id}
                                className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] text-white font-medium"
                                style={{ background: avatarColor(p.name) }}
                                title={p.name}
                              >
                                {p.name.charAt(0)}
                              </div>
                            ))}
                            {parts.length > 4 && (
                              <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-medium">
                                +{parts.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/recording/${m.id}`) }}
                            className="btn-ghost !py-1 !px-2 text-xs"
                            title="进入录音"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/minutes/${m.id}`) }}
                            className="btn-ghost !py-1 !px-2 text-xs"
                            title="查看纪要"
                          >
                            <FileText size={14} />
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuId(menuId === m.id ? null : m.id) }}
                              className="btn-ghost !py-1 !px-2"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {menuId === m.id && (
                              <div
                                className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => toggleLock(m)}
                                  className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                                >
                                  {m.isLocked ? <><LockOpen size={14} /> 解锁会议</> : <><Lock size={14} /> 锁定会议</>}
                                </button>
                                <button
                                  onClick={() => handleDelete(m.id)}
                                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> 删除会议
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="w-80 border-l border-slate-200 bg-white p-5 overflow-y-auto scrollbar-thin shrink-0 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Users size={16} /> 参会人管理
            </h3>
            {currentMeetingId ? (
              <ParticipantsPanel
                meetingId={currentMeetingId}
                key={currentMeetingId}
              />
            ) : (
              <div className="text-sm text-slate-400 p-4 text-center bg-slate-50 rounded-lg">请先选择一场会议</div>
            )}
          </div>

          <div className="pt-5 border-t border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-3">会议小贴士</h3>
            <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
              <div className="p-3 rounded-lg bg-blue-50/60 text-blue-700">
                💡 录制前请先确认麦克风设备正常，选择合适的音频输入源。
              </div>
              <div className="p-3 rounded-lg bg-green-50/60 text-green-700">
                ✅ 结束后可自动生成会议纪要、待办任务和风险项。
              </div>
              <div className="p-3 rounded-lg bg-amber-50/60 text-amber-700">
                🔒 敏感会议可设置访问密码保护资料安全。
              </div>
            </div>
          </div>
        </aside>
      </div>

      {showModal && <MeetingFormModal onClose={() => setShowModal(false)} />}

      {lockPwdInput && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              {lockPwdInput.mode === 'lock' ? '设置访问密码' : '输入访问密码'}
            </h3>
            <input
              type="password"
              value={pwdValue}
              onChange={e => setPwdValue(e.target.value)}
              placeholder="请输入密码"
              className="input mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setLockPwdInput(null); setPwdValue('') }} className="btn-secondary">取消</button>
              <button onClick={confirmLock} className="btn-primary">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}
