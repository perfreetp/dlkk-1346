import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, List, Plus, Search, Filter, Calendar,
  Flag, User, MoreHorizontal, CheckCircle2, Clock, AlertCircle,
  Trash2, Edit2, X, ArrowUpDown, Link2, FileText
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn, formatDate, formatDateTime, statusText, statusColor, avatarColor } from '@/utils'
import type { Task, TaskStatus, TaskPriority, Meeting } from '@/types'

const COLUMNS: { key: TaskStatus; label: string; color: string; dotColor: string; icon: any }[] = [
  { key: 'todo', label: '待办', color: 'border-slate-300 bg-slate-50/50', dotColor: 'bg-slate-400', icon: Clock },
  { key: 'in_progress', label: '进行中', color: 'border-blue-300 bg-blue-50/40', dotColor: 'bg-blue-500', icon: ArrowUpDown },
  { key: 'review', label: '待评审', color: 'border-purple-300 bg-purple-50/40', dotColor: 'bg-purple-500', icon: AlertCircle },
  { key: 'done', label: '已完成', color: 'border-green-300 bg-green-50/40', dotColor: 'bg-green-500', icon: CheckCircle2 }
]

export default function Tasks() {
  const tasks = useAppStore(s => s.tasks)
  const setTasks = useAppStore(s => s.setTasks)
  const addTask = useAppStore(s => s.addTask)
  const updateTaskStore = useAppStore(s => s.updateTask)
  const removeTaskStore = useAppStore(s => s.removeTask)
  const meetings = useAppStore(s => s.meetings)
  const participants = useAppStore(s => s.participants)

  const [view, setView] = useState<'board' | 'list'>('board')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [menuTaskId, setMenuTaskId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'updatedAt'>('updatedAt')

  const allAssignees = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => t.assignee && set.add(t.assignee))
    participants.forEach(p => set.add(p.name))
    return Array.from(set)
  }, [tasks, participants])

  const filtered = useMemo(() => {
    let list = tasks.filter(t => {
      if (search && !t.title.includes(search) && !(t.description || '').includes(search)) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (assigneeFilter !== 'all' && t.assignee !== assigneeFilter) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'dueDate') {
        return (a.dueDate || '9').localeCompare(b.dueDate || '9')
      }
      if (sortBy === 'priority') {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (order[a.priority] ?? 5) - (order[b.priority] ?? 5)
      }
      return (b.updatedAt || '').localeCompare(a.updatedAt || '')
    })
    return list
  }, [tasks, search, priorityFilter, assigneeFilter, sortBy])

  const byColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [] }
    filtered.forEach(t => { map[t.status].push(t) })
    return map
  }, [filtered])

  const getMeeting = (mid?: number) => meetings.find(m => m.id === mid)

  const createOrUpdate = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => {
    if (!data.title.trim()) {
      alert('请填写任务标题')
      return
    }
    if (data.id) {
      const updated = await window.api.tasks.update(data.id, data)
      updateTaskStore(updated)
    } else {
      const created = await window.api.tasks.create(data as any)
      addTask(created)
    }
    setShowModal(false)
    setEditing(null)
  }

  const removeTask = async (id: number) => {
    if (!confirm('确定删除此任务？')) return
    await window.api.tasks.delete(id)
    removeTaskStore(id)
    setMenuTaskId(null)
  }

  const updateStatus = async (task: Task, status: TaskStatus) => {
    const updated = await window.api.tasks.update(task.id, { status })
    updateTaskStore(updated)
  }

  const openNew = () => { setEditing(null); setShowModal(true) }
  const openEdit = (t: Task) => { setEditing(t); setShowModal(true); setMenuTaskId(null) }

  const moveNext = (t: Task) => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']
    const idx = order.indexOf(t.status)
    if (idx < order.length - 1) updateStatus(t, order[idx + 1])
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate.replace(' ', 'T')) < new Date()).length
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center gap-4 shrink-0">
        <div>
          <h1 className="font-semibold text-slate-800 text-lg">任务中心</h1>
          <div className="text-xs text-slate-400">共 {stats.total} 项任务 · 进行中 {stats.inProgress} · 已完成 {stats.done}</div>
        </div>

        <div className="flex-1 max-w-md ml-8 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索任务..."
            className="input pl-9"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as any)}
          className="select !w-28"
        >
          <option value="all">全部优先级</option>
          <option value="urgent">紧急</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          className="select !w-32"
        >
          <option value="all">全部负责人</option>
          {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="select !w-32"
        >
          <option value="updatedAt">最近更新</option>
          <option value="dueDate">截止日期</option>
          <option value="priority">优先级</option>
        </select>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
          <button
            onClick={() => setView('board')}
            className={cn('px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition',
              view === 'board' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
          >
            <LayoutDashboard size={13} /> 看板
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition',
              view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
          >
            <List size={13} /> 列表
          </button>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={16} /> 新建任务
        </button>
      </header>

      <div className="px-6 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            <span className="text-slate-500">待办：</span>
            <span className="font-semibold text-slate-800">{stats.todo}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-blue-500" />
            <span className="text-slate-500">进行中：</span>
            <span className="font-semibold text-blue-600">{stats.inProgress}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-purple-500" />
            <span className="text-slate-500">待评审：</span>
            <span className="font-semibold text-purple-600">{stats.review}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-500" />
            <span className="text-slate-500">已完成：</span>
            <span className="font-semibold text-green-600">{stats.done}</span>
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-2 ml-auto px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
              <AlertCircle size={12} /> {stats.overdue} 项已逾期
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {view === 'board' ? (
          <div className="h-full grid grid-cols-4 gap-4 min-h-0">
            {COLUMNS.map(col => (
              <div key={col.key} className={cn('rounded-xl border-2 flex flex-col min-h-0', col.color)}>
                <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-200/50 shrink-0">
                  <span className={cn('w-2 h-2 rounded-full', col.dotColor)} />
                  <span className="font-semibold text-sm text-slate-700">{col.label}</span>
                  <span className="tag bg-white/80 text-slate-500 text-[11px] ml-auto">{byColumn[col.key].length}</span>
                  <button
                    onClick={() => { setEditing({ status: col.key } as any); setShowModal(true) }}
                    className="p-1 rounded hover:bg-white/70 text-slate-400 hover:text-slate-600 transition"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5">
                  {byColumn[col.key].length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      暂无任务
                    </div>
                  ) : byColumn[col.key].map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      meeting={getMeeting(t.meetingId)}
                      onEdit={() => openEdit(t)}
                      onDelete={() => removeTask(t.id)}
                      onMenu={() => setMenuTaskId(menuTaskId === t.id ? null : t.id)}
                      menuOpen={menuTaskId === t.id}
                      onStatusChange={async (s) => updateStatus(t, s)}
                      onNext={() => moveNext(t)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium w-10"></th>
                  <th className="px-4 py-3 font-medium">任务</th>
                  <th className="px-4 py-3 font-medium w-32">优先级</th>
                  <th className="px-4 py-3 font-medium w-28">负责人</th>
                  <th className="px-4 py-3 font-medium w-32">截止日期</th>
                  <th className="px-4 py-3 font-medium w-28">状态</th>
                  <th className="px-4 py-3 font-medium w-28">关联会议</th>
                  <th className="px-4 py-3 font-medium w-24">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">暂无任务，点击"新建任务"开始</td></tr>
                ) : filtered.map(t => {
                  const overdue = t.status !== 'done' && t.dueDate && new Date(t.dueDate.replace(' ', 'T')) < new Date()
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => updateStatus(t, t.status === 'done' ? 'todo' : 'done')}
                          className={cn(
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center transition',
                            t.status === 'done'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-slate-300 hover:border-green-400'
                          )}
                        >
                          {t.status === 'done' && <CheckCircle2 size={13} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn('font-medium', t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800')}>
                          {t.title}
                        </div>
                        {t.description && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('tag', statusColor(t.priority))}>
                          <Flag size={10} className="mr-0.5" /> {statusText(t.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ background: avatarColor(t.assignee) }}
                            >{t.assignee.charAt(0)}</div>
                            <span className="text-xs text-slate-600">{t.assignee}</span>
                          </div>
                        ) : <span className="text-xs text-slate-400">未分配</span>}
                      </td>
                      <td className="px-4 py-3">
                        {t.dueDate ? (
                          <span className={cn(
                            'text-xs inline-flex items-center gap-1',
                            overdue ? 'text-red-600 font-medium' : 'text-slate-600'
                          )}>
                            <Calendar size={11} /> {formatDate(t.dueDate)}
                            {overdue && <AlertCircle size={11} />}
                          </span>
                        ) : <span className="text-xs text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('tag', statusColor(t.status === 'in_progress' ? 'in_progress_task' : t.status))}>
                          {statusText(t.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.meetingId ? (
                          <span className="text-xs text-primary-600 hover:underline cursor-pointer inline-flex items-center gap-1">
                            <FileText size={11} /> {getMeeting(t.meetingId)?.title?.slice(0, 10) || '-'}
                          </span>
                        ) : <span className="text-xs text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => removeTask(t.id)} className="p-1 rounded hover:bg-red-50 text-slate-500 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSubmit={createOrUpdate}
          meetings={meetings}
          assignees={allAssignees}
        />
      )}
    </div>
  )
}

function TaskCard({
  task, meeting, onEdit, onDelete, onMenu, menuOpen, onStatusChange, onNext
}: {
  task: Task
  meeting?: Meeting
  onEdit: () => void
  onDelete: () => void
  onMenu: () => void
  menuOpen: boolean
  onStatusChange: (s: TaskStatus) => void
  onNext: () => void
}) {
  const overdue = task.status !== 'done' && task.dueDate && new Date(task.dueDate.replace(' ', 'T')) < new Date()
  const priorityLabel = { urgent: '紧急', high: '高', medium: '中', low: '低' }[task.priority]
  const priorityBorder = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-blue-500',
    low: 'border-l-slate-300'
  }[task.priority]

  return (
    <div className={cn(
      'group relative bg-white rounded-lg shadow-sm border border-slate-200 p-3.5 cursor-pointer hover:shadow-md transition',
      `border-l-4 ${priorityBorder}`,
      task.status === 'done' && 'opacity-70'
    )}>
      <div className="flex items-start gap-2 mb-2">
        <h4 className={cn(
          'flex-1 text-sm font-medium text-slate-800 leading-snug',
          task.status === 'done' && 'line-through text-slate-400'
        )}>
          {task.title}
        </h4>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); onMenu() }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 transition"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 text-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[11px] text-slate-400 border-b border-slate-100">移到</div>
              {COLUMNS.filter(c => c.key !== task.status).map(c => (
                <button
                  key={c.key}
                  onClick={() => { onStatusChange(c.key); onMenu() }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 inline-flex items-center gap-2"
                >
                  <span className={cn('w-2 h-2 rounded-full', c.dotColor)} />{c.label}
                </button>
              ))}
              <div className="border-t border-slate-100 my-1" />
              <button onClick={onEdit} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 inline-flex items-center gap-2">
                <Edit2 size={12} /> 编辑
              </button>
              <button onClick={onDelete} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 inline-flex items-center gap-2">
                <Trash2 size={12} /> 删除
              </button>
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={cn('tag text-[10px]', {
          urgent: 'bg-red-100 text-red-700',
          high: 'bg-orange-100 text-orange-700',
          medium: 'bg-blue-100 text-blue-700',
          low: 'bg-slate-100 text-slate-600'
        }[task.priority])}>
          <Flag size={9} className="mr-0.5" /> {priorityLabel}
        </span>
        {task.status !== 'done' && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext() }}
            className="tag bg-primary-50 text-primary-700 text-[10px] hover:bg-primary-100 transition"
          >
            → 下一状态
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
        <div className="flex items-center gap-3">
          {task.assignee ? (
            <div className="flex items-center gap-1">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: avatarColor(task.assignee), fontSize: 9 }}
              >{task.assignee.charAt(0)}</div>
              <span className="text-slate-600">{task.assignee}</span>
            </div>
          ) : (
            <span className="text-slate-400 inline-flex items-center gap-1"><User size={10} /> 未分配</span>
          )}
          {task.dueDate && (
            <span className={cn(
              'inline-flex items-center gap-1',
              overdue ? 'text-red-600 font-medium' : 'text-slate-500'
            )}>
              <Calendar size={10} /> {formatDate(task.dueDate)}
            </span>
          )}
        </div>
        {meeting && (
          <span className="text-slate-400 inline-flex items-center gap-1" title={meeting.title}>
            <Link2 size={10} /> 关联
          </span>
        )}
      </div>
    </div>
  )
}

function TaskModal({
  task, onClose, onSubmit, meetings, assignees
}: {
  task: Task | null
  onClose: () => void
  onSubmit: (data: any) => void
  meetings: Meeting[]
  assignees: string[]
}) {
  const isEdit = !!task?.id
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    id: task?.id,
    title: task?.title || '',
    description: task?.description || '',
    assignee: task?.assignee || '',
    status: (task?.status || 'todo') as TaskStatus,
    priority: (task?.priority || 'medium') as TaskPriority,
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
    meetingId: task?.meetingId || undefined as number | undefined
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-lg">{isEdit ? '编辑任务' : '新建任务'}</h2>
          <button onClick={onClose} className="btn-ghost !p-1">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">任务标题 <span className="text-red-500">*</span></label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="输入任务标题"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">任务描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="textarea"
              rows={3}
              placeholder="详细描述任务内容和要求..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">负责人</label>
              <select
                value={form.assignee}
                onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                className="select"
              >
                <option value="">未分配</option>
                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">优先级</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                className="select"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                className="select"
              >
                <option value="todo">待办</option>
                <option value="in_progress">进行中</option>
                <option value="review">待评审</option>
                <option value="done">已完成</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">截止日期</label>
              <input
                type="date"
                value={form.dueDate}
                min={today}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">关联会议</label>
            <select
              value={form.meetingId || ''}
              onChange={e => setForm(f => ({ ...f, meetingId: e.target.value ? Number(e.target.value) : undefined }))}
              className="select"
            >
              <option value="">不关联</option>
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  {formatDate(m.startTime)} · {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button
            onClick={() => onSubmit({
              ...form,
              dueDate: form.dueDate ? `${form.dueDate} 18:00:00` : undefined
            })}
            className="btn-primary"
          >
            {isEdit ? '保存修改' : '创建任务'}
          </button>
        </div>
      </div>
    </div>
  )
}
