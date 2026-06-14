import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, Plus, Save, GripVertical, CheckCircle,
  AlertTriangle, Lightbulb, MessageCircleWarning, ListTodo, FileText,
  ChevronDown, ChevronRight, Edit3, Trash2, Users, Calendar,
  FileDown, Mail, Copy, Clock, Play, Check, X, User
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn, formatDateTime, formatDate, formatDuration, safeParseJSON, statusText, statusColor, avatarColor } from '@/utils'
import type { Meeting, AgendaItem, MeetingMinutes as MeetingMinutesType, Participant, TranscriptSegment, Task } from '@/types'

type TabKey = 'summary' | 'todos' | 'risks' | 'conclusions' | 'disputes'

interface TodoItem { content: string; assignee?: string; dueDate?: string; done?: boolean }
interface RiskItem { content: string; level: 'low' | 'medium' | 'high' }
interface SimpleItem { content: string }

const TABS: { key: TabKey; label: string; icon: any; color: string; desc: string }[] = [
  { key: 'summary', label: '摘要', icon: Lightbulb, color: 'text-blue-600', desc: '提炼会议核心讨论与关键信息' },
  { key: 'todos', label: '待办事项', icon: ListTodo, color: 'text-green-600', desc: '会后需要跟进的任务清单' },
  { key: 'risks', label: '风险点', icon: AlertTriangle, color: 'text-amber-600', desc: '项目执行中可能出现的问题' },
  { key: 'conclusions', label: '结论', icon: CheckCircle, color: 'text-emerald-600', desc: '会议达成的明确决策与共识' },
  { key: 'disputes', label: '争议点', icon: MessageCircleWarning, color: 'text-rose-600', desc: '存在分歧、需要进一步讨论的事项' }
]

export default function Minutes() {
  const { meetingId } = useParams()
  const navigate = useNavigate()
  const mid = Number(meetingId)
  const meetings = useAppStore(s => s.meetings)
  const setCurrentMeetingId = useAppStore(s => s.setCurrentMeetingId)
  const addTask = useAppStore(s => s.addTask)

  const meeting = meetings.find(m => m.id === mid) as Meeting | undefined

  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [minutes, setMinutes] = useState<MeetingMinutesType | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('summary')
  const [expandedAgendas, setExpandedAgendas] = useState<Record<number, boolean>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeAgendaId, setActiveAgendaId] = useState<number | 'all'>('all')
  const [toast, setToast] = useState<string>('')

  const load = async () => {
    setCurrentMeetingId(mid)
    const [ag, mn, ps, ts] = await Promise.all([
      window.api.agendas.getByMeeting(mid),
      window.api.minutes.getByMeeting(mid),
      window.api.participants.getByMeeting(mid),
      window.api.transcripts.getByMeeting(mid)
    ])
    setAgendas(ag as AgendaItem[])
    setMinutes(mn as MeetingMinutesType | null)
    setParticipants(ps as Participant[])
    setTranscripts(ts as TranscriptSegment[])
    const exp: Record<number, boolean> = {}
    ;(ag as AgendaItem[]).forEach(a => { exp[a.id] = true })
    setExpandedAgendas(exp)
    if (ag.length > 0) setActiveAgendaId(ag[0].id)
  }

  useEffect(() => { load() }, [mid])

  const summaries = useMemo<string[]>(() => safeParseJSON(minutes?.summary, []), [minutes?.summary])
  const todos = useMemo<TodoItem[]>(() => safeParseJSON(minutes?.todos, []), [minutes?.todos])
  const risks = useMemo<RiskItem[]>(() => safeParseJSON(minutes?.risks, []), [minutes?.risks])
  const conclusions = useMemo<SimpleItem[]>(() => safeParseJSON(minutes?.conclusions, []), [minutes?.conclusions])
  const disputes = useMemo<SimpleItem[]>(() => safeParseJSON(minutes?.disputes, []), [minutes?.disputes])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const saveMinutes = async (patch: Partial<MeetingMinutesType>) => {
    if (minutes) {
      const updated = await window.api.minutes.update(minutes.id, patch)
      setMinutes(updated)
    } else {
      const created = await window.api.minutes.create({
        meetingId: mid,
        summary: '[]',
        todos: '[]',
        risks: '[]',
        conclusions: '[]',
        disputes: '[]',
        ...patch
      })
      setMinutes(created)
    }
  }

  const updateList = <T,>(key: keyof MeetingMinutesType, value: T[]) => {
    const str = JSON.stringify(value)
    saveMinutes({ [key]: str } as any)
  }

  const generateFromTranscript = async () => {
    if (transcripts.length === 0) {
      alert('暂无转写内容，请先进行录音或导入音频')
      return
    }
    setIsGenerating(true)
    await new Promise(r => setTimeout(r, 1500))

    const sample = transcripts.slice(0, 6).map(t => t.content)
    const genSummaries = [
      `本次会议围绕"${meeting?.title || '主题讨论'}"展开，明确了 Q2 的核心方向为体验优化优先。`,
      '技术团队对当前性能问题进行了全面分析，确定了首屏加载、接口响应、交互流畅度为三大改进点。',
      '已成立专项小组，由技术负责人牵头，下周一前交付完整的技术方案与排期。'
    ]
    const genTodos: TodoItem[] = [
      { content: '输出性能优化专项技术方案', assignee: participants[2]?.name || '技术负责人', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) },
      { content: '整理客户定制化需求清单', assignee: participants[1]?.name || '产品总监', dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) },
      { content: '准备下周项目评审材料', assignee: participants[0]?.name || '项目经理' },
      { content: '评估并引入性能监控平台方案', assignee: participants[3]?.name || '前端工程师' }
    ]
    const genRisks: RiskItem[] = [
      { content: '第三方支付接口稳定性不足，存在交易失败风险', level: 'high' },
      { content: '性能优化可能影响既有功能，需建立回归测试机制', level: 'medium' },
      { content: '核心开发资源紧张，人员变动可能延期交付', level: 'medium' }
    ]
    const genConclusions: SimpleItem[] = [
      { content: 'Q2 优先级调整：性能优化 > 新功能开发' },
      { content: '每周五下午召开项目进度同步例会' },
      { content: '性能方案通过后立即启动开发，目标 6 周内上线' }
    ]
    const genDisputes: SimpleItem[] = [
      { content: '关于首页改版方案：设计部倾向交互创新，产品部担心学习成本过高，需会后小范围拉通' },
      { content: '技术选型：是否引入微前端架构，技术团队内部存在不同意见' }
    ]

    await saveMinutes({
      summary: JSON.stringify(genSummaries),
      todos: JSON.stringify(genTodos),
      risks: JSON.stringify(genRisks),
      conclusions: JSON.stringify(genConclusions),
      disputes: JSON.stringify(genDisputes)
    })
    await load()
    setIsGenerating(false)
    showToast('AI 智能生成完成！')
  }

  const syncTodosToTaskCenter = async () => {
    if (todos.length === 0) return
    let cnt = 0
    for (const t of todos) {
      const created = await window.api.tasks.create({
        meetingId: mid,
        title: t.content,
        description: `来自会议《${meeting?.title || ''}》的待办事项`,
        assignee: t.assignee,
        status: 'todo',
        priority: 'medium',
        dueDate: t.dueDate ? `${t.dueDate} 18:00:00` : undefined
      })
      addTask(created)
      cnt++
    }
    showToast(`已同步 ${cnt} 条待办到任务中心`)
  }

  const copyAllText = async () => {
    const sections: string[] = [`# ${meeting?.title || '会议纪要'}`]
    sections.push(`\n时间：${formatDateTime(meeting?.startTime)}${meeting?.endTime ? ` ~ ${formatDateTime(meeting?.endTime)}` : ''}`)
    sections.push(`地点：${meeting?.location || '-'}`)
    sections.push(`参会人：${participants.map(p => `${p.name}${p.role ? `(${p.role})` : ''}`).join('、') || '-'}`)
    if (summaries.length) sections.push(`\n## 摘要\n${summaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}`)
    if (conclusions.length) sections.push(`\n## 结论\n${conclusions.map((s, i) => `${i + 1}. ${s.content}`).join('\n')}`)
    if (todos.length) sections.push(`\n## 待办事项\n${todos.map((t, i) => `${i + 1}. ${t.content}${t.assignee ? ` - 负责人：${t.assignee}` : ''}${t.dueDate ? `，截止：${t.dueDate}` : ''}`).join('\n')}`)
    if (risks.length) sections.push(`\n## 风险点\n${risks.map((r, i) => `${i + 1}. [${{ low: '低', medium: '中', high: '高' }[r.level]}风险] ${r.content}`).join('\n')}`)
    if (disputes.length) sections.push(`\n## 争议点\n${disputes.map((d, i) => `${i + 1}. ${d.content}`).join('\n')}`)
    const text = sections.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      showToast('纪要已复制到剪贴板')
    } catch {
      showToast('复制失败，请手动复制')
    }
  }

  const emailContent = useMemo(() => {
    const lines = [
      `各位同事好，\n`,
      `${formatDate(meeting?.startTime)}我们召开了《${meeting?.title || ''}》，现将会议纪要同步如下：\n`,
      `【会议摘要】`,
      ...summaries.map((s, i) => `${i + 1}. ${s}`),
      '',
      `【会议结论】`,
      ...conclusions.map((c, i) => `${i + 1}. ${c.content}`),
      '',
      `【待办事项】`,
      ...todos.map((t, i) => `${i + 1}. ${t.content}${t.assignee ? `（${t.assignee} 负责）` : ''}${t.dueDate ? `，截止 ${t.dueDate}` : ''}`),
      '',
      `请相关同事按照要求推进，如有疑问请及时沟通。\n`,
      `—— ${participants.find(p => p.isHost)?.name || '会议秘书处'} 敬上`
    ]
    return lines.join('\n')
  }, [meeting, summaries, conclusions, todos, participants])

  const generateEmailBody = async () => {
    try {
      await navigator.clipboard.writeText(emailContent)
      showToast('邮件正文已生成并复制到剪贴板')
    } catch {
      showToast('复制失败')
    }
  }

  const addAgenda = async () => {
    const title = prompt('请输入议题标题')
    if (!title?.trim()) return
    const created = await window.api.agendas.create({
      meetingId: mid,
      title: title.trim(),
      orderIndex: agendas.length + 1,
      status: 'pending'
    })
    setAgendas(a => [...a, created])
    setExpandedAgendas(e => ({ ...e, [created.id]: true }))
    setActiveAgendaId(created.id)
  }

  const removeAgenda = async (id: number) => {
    if (!confirm('确定删除此议题？')) return
    await window.api.agendas.delete(id)
    setAgendas(a => a.filter(x => x.id !== id))
    if (activeAgendaId === id) setActiveAgendaId('all')
  }

  const updateAgenda = async (id: number, patch: Partial<AgendaItem>) => {
    const updated = await window.api.agendas.update(id, patch)
    setAgendas(a => a.map(x => x.id === id ? updated : x))
  }

  const addItem = <T,>(key: TabKey, base: T) => {
    if (key === 'summary') updateList<string>('summary', [...summaries, '' as any])
    else if (key === 'todos') updateList<TodoItem>('todos', [...todos, { content: '' } as any])
    else if (key === 'risks') updateList<RiskItem>('risks', [...risks, { content: '', level: 'medium' } as any])
    else updateList<SimpleItem>(key === 'conclusions' ? 'conclusions' : 'disputes', [
      ...(key === 'conclusions' ? conclusions : disputes), { content: '' } as any
    ])
  }

  const removeItem = <T,>(key: TabKey, idx: number) => {
    if (key === 'summary') updateList('summary', summaries.filter((_, i) => i !== idx))
    else if (key === 'todos') updateList('todos', todos.filter((_, i) => i !== idx))
    else if (key === 'risks') updateList('risks', risks.filter((_, i) => i !== idx))
    else if (key === 'conclusions') updateList('conclusions', conclusions.filter((_, i) => i !== idx))
    else updateList('disputes', disputes.filter((_, i) => i !== idx))
  }

  const TabIcon = TABS.find(t => t.key === activeTab)?.icon || FileText

  const renderList = () => {
    if (activeTab === 'summary') {
      return (
        <div className="space-y-3">
          {summaries.length === 0 && <EmptyHint text="暂无摘要，点击下方按钮添加或让 AI 自动生成" />}
          {summaries.map((item, idx) => (
            <EditableItemCard key={idx} index={idx} color="blue">
              <textarea
                value={item}
                onChange={e => {
                  const next = [...summaries]; next[idx] = e.target.value
                  updateList('summary', next)
                }}
                placeholder="输入摘要内容..."
                className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 min-h-[60px]"
                rows={2}
              />
            </EditableItemCard>
          ))}
          <button onClick={() => addItem<string>('summary', '' as any)} className="btn-secondary w-full justify-center text-slate-500 !py-2">
            <Plus size={14} /> 添加一条摘要
          </button>
        </div>
      )
    }
    if (activeTab === 'todos') {
      return (
        <div className="space-y-3">
          {todos.length === 0 && <EmptyHint text="暂无待办事项" />}
          {todos.map((t, idx) => (
            <EditableItemCard key={idx} index={idx} color="green" onRemove={() => removeItem('todos', idx)}>
              <div className="space-y-2">
                <textarea
                  value={t.content}
                  onChange={e => {
                    const next = [...todos]; next[idx] = { ...t, content: e.target.value }
                    updateList('todos', next)
                  }}
                  placeholder="待办内容..."
                  className="w-full bg-transparent border-none outline-none resize-none text-sm text-slate-700 placeholder:text-slate-400 min-h-[48px]"
                  rows={2}
                />
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">负责人</label>
                    <select
                      value={t.assignee || ''}
                      onChange={e => {
                        const next = [...todos]; next[idx] = { ...t, assignee: e.target.value || undefined }
                        updateList('todos', next)
                      }}
                      className="select !py-1 !text-xs"
                    >
                      <option value="">未分配</option>
                      {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">截止日期</label>
                    <input
                      type="date"
                      value={t.dueDate || ''}
                      onChange={e => {
                        const next = [...todos]; next[idx] = { ...t, dueDate: e.target.value || undefined }
                        updateList('todos', next)
                      }}
                      className="input !py-1 !text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.done || false}
                        onChange={e => {
                          const next = [...todos]; next[idx] = { ...t, done: e.target.checked }
                          updateList('todos', next)
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                      />
                      标记完成
                    </label>
                  </div>
                </div>
              </div>
            </EditableItemCard>
          ))}
          <div className="flex gap-2">
            <button onClick={() => addItem('todos', {} as any)} className="flex-1 btn-secondary justify-center text-slate-500 !py-2">
              <Plus size={14} /> 添加待办
            </button>
            {todos.length > 0 && (
              <button onClick={syncTodosToTaskCenter} className="btn-primary !py-2">
                <Save size={14} /> 同步到任务中心
              </button>
            )}
          </div>
        </div>
      )
    }
    if (activeTab === 'risks') {
      return (
        <div className="space-y-3">
          {risks.length === 0 && <EmptyHint text="暂无风险点" />}
          {risks.map((r, idx) => (
            <EditableItemCard key={idx} index={idx} color="amber" onRemove={() => removeItem('risks', idx)}>
              <div className="space-y-2">
                <textarea
                  value={r.content}
                  onChange={e => {
                    const next = [...risks]; next[idx] = { ...r, content: e.target.value }
                    updateList('risks', next)
                  }}
                  placeholder="描述风险内容..."
                  className="w-full bg-transparent border-none outline-none resize-none text-sm text-slate-700 placeholder:text-slate-400 min-h-[48px]"
                  rows={2}
                />
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">风险等级：</span>
                  {(['low', 'medium', 'high'] as const).map(lv => (
                    <button
                      key={lv}
                      onClick={() => {
                        const next = [...risks]; next[idx] = { ...r, level: lv }
                        updateList('risks', next)
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium transition',
                        r.level === lv
                          ? lv === 'high' ? 'bg-red-100 text-red-700 border border-red-200'
                          : lv === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      {{ low: '低风险', medium: '中风险', high: '高风险' }[lv]}
                    </button>
                  ))}
                </div>
              </div>
            </EditableItemCard>
          ))}
          <button onClick={() => addItem('risks', {} as any)} className="btn-secondary w-full justify-center text-slate-500 !py-2">
            <Plus size={14} /> 添加风险点
          </button>
        </div>
      )
    }
    if (activeTab === 'conclusions') {
      return (
        <div className="space-y-3">
          {conclusions.length === 0 && <EmptyHint text="暂无结论" />}
          {conclusions.map((c, idx) => (
            <EditableItemCard key={idx} index={idx} color="emerald" onRemove={() => removeItem('conclusions', idx)}>
              <textarea
                value={c.content}
                onChange={e => {
                  const next = [...conclusions]; next[idx] = { content: e.target.value }
                  updateList('conclusions', next)
                }}
                placeholder="描述达成的结论..."
                className="w-full bg-transparent border-none outline-none resize-none text-sm text-slate-700 placeholder:text-slate-400 min-h-[60px]"
                rows={2}
              />
            </EditableItemCard>
          ))}
          <button onClick={() => addItem('conclusions', {} as any)} className="btn-secondary w-full justify-center text-slate-500 !py-2">
            <Plus size={14} /> 添加一条结论
          </button>
        </div>
      )
    }
    // disputes
    return (
      <div className="space-y-3">
        {disputes.length === 0 && <EmptyHint text="暂无争议点" />}
        {disputes.map((d, idx) => (
          <EditableItemCard key={idx} index={idx} color="rose" onRemove={() => removeItem('disputes', idx)}>
            <textarea
              value={d.content}
              onChange={e => {
                const next = [...disputes]; next[idx] = { content: e.target.value }
                updateList('disputes', next)
              }}
              placeholder="描述存在争议的事项..."
              className="w-full bg-transparent border-none outline-none resize-none text-sm text-slate-700 placeholder:text-slate-400 min-h-[60px]"
              rows={2}
            />
          </EditableItemCard>
        ))}
        <button onClick={() => addItem('disputes', {} as any)} className="btn-secondary w-full justify-center text-slate-500 !py-2">
          <Plus size={14} /> 添加一个争议点
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate(-1)} className="btn-ghost !px-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-800 truncate">{meeting?.title || '会议纪要'}</h1>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            {meeting && <span className="inline-flex items-center gap-1"><Calendar size={11} />{formatDateTime(meeting.startTime)}</span>}
            {participants.length > 0 && <span className="inline-flex items-center gap-1"><Users size={11} />{participants.length} 人参加</span>}
          </div>
        </div>
        <button onClick={generateFromTranscript} disabled={isGenerating} className="btn-primary !py-1.5">
          <Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />
          {isGenerating ? 'AI 生成中...' : 'AI 智能生成'}
        </button>
        <button onClick={copyAllText} className="btn-secondary !py-1.5">
          <Copy size={14} /> 复制全文
        </button>
        <button onClick={generateEmailBody} className="btn-secondary !py-1.5">
          <Mail size={14} /> 生成邮件
        </button>
        <button className="btn-secondary !py-1.5">
          <FileDown size={14} /> 导出
        </button>
      </header>

      <div className="flex-1 overflow-hidden flex">
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <FileText size={14} className="text-primary-600" /> 议题清单
              </h3>
              <button onClick={addAgenda} className="btn-ghost !p-1" title="添加议题">
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={() => setActiveAgendaId('all')}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 transition flex items-center justify-between',
                activeAgendaId === 'all' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <span>📋 全部议题</span>
              <span className="tag bg-slate-100 text-slate-500 text-[10px]">{agendas.length}</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
            {agendas.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">暂无议题</div>
            ) : agendas.map(a => (
              <div key={a.id}>
                <div
                  onClick={() => setActiveAgendaId(a.id)}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition',
                    activeAgendaId === a.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <GripVertical size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 shrink-0" />
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0',
                    a.status === 'completed' ? 'bg-green-100 text-green-700'
                    : a.status === 'in_progress' ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500'
                  )}>
                    {a.status === 'completed' ? <Check size={12} /> : a.orderIndex}
                  </span>
                  <span className="flex-1 truncate">{a.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedAgendas(ex => ({ ...ex, [a.id]: !ex[a.id] })) }}
                    className="p-0.5 rounded hover:bg-white/60"
                  >
                    {expandedAgendas[a.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>
                {expandedAgendas[a.id] && (
                  <div className="ml-7 pl-4 border-l border-slate-200 py-2 space-y-1">
                    <select
                      value={a.status}
                      onChange={e => updateAgenda(a.id, { status: e.target.value as any })}
                      className="select !py-1 !text-[11px] w-full"
                    >
                      <option value="pending">待讨论</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <Clock size={11} className="text-slate-400 shrink-0" />
                      <input
                        type="number"
                        value={a.duration || ''}
                        onChange={e => updateAgenda(a.id, { duration: Number(e.target.value) || undefined })}
                        className="input !py-1 !text-[11px] w-full"
                        placeholder="分钟"
                      />
                      <span className="text-[11px] text-slate-400 shrink-0">分钟</span>
                    </div>
                    <button
                      onClick={() => removeAgenda(a.id)}
                      className="w-full text-left px-2 py-1 text-[11px] text-red-500 hover:bg-red-50 rounded inline-flex items-center gap-1"
                    >
                      <Trash2 size={11} /> 删除议题
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              <Users size={11} /> 参会人员
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {participants.slice(0, 8).map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200"
                  title={`${p.name}${p.role ? ` - ${p.role}` : ''}`}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ background: avatarColor(p.name) }}
                  >{p.name.charAt(0)}</div>
                  <span className="text-[11px] text-slate-600">{p.name}</span>
                </div>
              ))}
              {participants.length > 8 && (
                <div className="text-[11px] text-slate-400 px-2 py-1">+{participants.length - 8}</div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto scrollbar-thin bg-slate-50">
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
              <div className="border-b border-slate-100 overflow-x-auto scrollbar-thin">
                <div className="flex min-w-full">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition relative flex items-center justify-center gap-1.5',
                        activeTab === tab.key
                          ? `${tab.color} border-b-2 border-current bg-slate-50/60`
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <tab.icon size={15} />
                      {tab.label}
                      <span className={cn(
                        'tag text-[10px]',
                        activeTab === tab.key ? 'bg-white' : 'bg-slate-100'
                      )}>
                        {activeTab === tab.key ? summaries.length :
                          tab.key === 'todos' ? todos.length :
                          tab.key === 'risks' ? risks.length :
                          tab.key === 'conclusions' ? conclusions.length : disputes.length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <div className="mb-5 flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className={cn('p-2 rounded-lg bg-white', TABS.find(t => t.key === activeTab)?.color)}>
                    <TabIcon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 text-sm">
                      {TABS.find(t => t.key === activeTab)?.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {TABS.find(t => t.key === activeTab)?.desc}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {activeAgendaId === 'all' ? '全部议题' : agendas.find(a => a.id === activeAgendaId)?.title}
                  </div>
                </div>
                {renderList()}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Play size={16} className="text-primary-600" /> 会议回放（转写原文）
              </h3>
              {transcripts.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-10">
                  暂无转写内容，请先前往录音窗口
                  <button onClick={() => navigate(`/recording/${mid}`)} className="ml-2 text-primary-600 hover:underline">
                    开始录音 →
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-2">
                  {transcripts.map(t => (
                    <div key={t.id} className="flex gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                        style={{ background: t.speakerColor || avatarColor(t.speaker || '?') }}
                      >
                        {(t.speaker || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium" style={{ color: t.speakerColor }}>{t.speaker || '未知'}</span>
                          <span className="text-[11px] text-slate-400">{formatDuration(t.startTime)}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{t.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg bg-slate-800 text-white text-sm shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
      {text}
    </div>
  )
}

function EditableItemCard({
  index, color, children, onRemove
}: { index: number; color: 'blue' | 'green' | 'amber' | 'emerald' | 'rose'; children: React.ReactNode; onRemove?: () => void }) {
  const colorMap = {
    blue: 'border-l-blue-500 bg-blue-50/30',
    green: 'border-l-green-500 bg-green-50/30',
    amber: 'border-l-amber-500 bg-amber-50/30',
    emerald: 'border-l-emerald-500 bg-emerald-50/30',
    rose: 'border-l-rose-500 bg-rose-50/30'
  }
  const numColorMap = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700'
  }
  return (
    <div className={cn('group rounded-xl border-l-4 p-4 pr-10 relative', colorMap[color], 'border border-slate-200/70 border-l-4')}>
      <span className={cn('absolute -left-0 top-4 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold -translate-x-1/2 shadow-sm', numColorMap[color])}>
        {index + 1}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      )}
      {children}
    </div>
  )
}
