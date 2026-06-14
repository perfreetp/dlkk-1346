import { useEffect, useState } from 'react'
import { Plus, X, UserPlus, Crown, Mail, Trash2 } from 'lucide-react'
import type { Participant } from '@/types'
import { avatarColor } from '@/utils'

interface Props {
  meetingId: number
}

export default function ParticipantsPanel({ meetingId }: Props) {
  const [list, setList] = useState<Participant[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('参会人')
  const [email, setEmail] = useState('')

  const load = async () => {
    const data = await window.api.participants.getByMeeting(meetingId)
    setList(data as Participant[])
  }
  useEffect(() => { load() }, [meetingId])

  const add = async () => {
    if (!name.trim()) return
    const newP = await window.api.participants.create({
      meetingId,
      name: name.trim(),
      role: role.trim() || undefined,
      email: email.trim() || undefined,
      isHost: list.length === 0 ? 1 : 0
    })
    setList(l => [...l, newP as Participant])
    setName(''); setRole('参会人'); setEmail(''); setShowAdd(false)
  }

  const remove = async (id: number) => {
    if (!confirm('确定移除该参会人？')) return
    await window.api.participants.delete(id)
    setList(l => l.filter(p => p.id !== id))
  }

  const setHost = async (id: number) => {
    for (const p of list) {
      await window.api.participants.update(p.id, { isHost: p.id === id ? 1 : 0 })
    }
    await load()
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowAdd(s => !s)}
        className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition flex items-center justify-center gap-1.5"
      >
        <UserPlus size={14} /> 添加参会人
      </button>

      {showAdd && (
        <div className="p-3 rounded-lg bg-slate-50 space-y-2 text-sm">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="姓名"
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <div className="grid grid-cols-2 gap-2">
            <input value={role} onChange={e => setRole(e.target.value)} className="input" placeholder="角色" />
            <input value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="邮箱" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs">取消</button>
            <button onClick={add} className="btn-primary text-xs"><Plus size={12} /> 添加</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="text-sm text-slate-400 py-4 text-center">暂无参会人</div>
        ) : list.map(p => (
          <div
            key={p.id}
            className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
              style={{ background: avatarColor(p.name) }}
            >
              {p.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-800 text-sm truncate">{p.name}</span>
                {p.isHost ? (
                  <Crown size={12} className="text-amber-500" title="主持人" />
                ) : (
                  <button
                    onClick={() => setHost(p.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-[10px] text-slate-400 hover:text-amber-500"
                    title="设为主持人"
                  >设为主持</button>
                )}
              </div>
              {p.role && <div className="text-xs text-slate-500 truncate">{p.role}</div>}
              {p.email && <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <Mail size={10} /> {p.email}
              </div>}
            </div>
            <button
              onClick={() => remove(p.id)}
              className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
