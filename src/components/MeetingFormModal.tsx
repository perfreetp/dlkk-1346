import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '@/store'
import type { MeetingType, MeetingStatus } from '@/types'

interface Props {
  onClose: () => void
}

export default function MeetingFormModal({ onClose }: Props) {
  const addMeeting = useAppStore(s => s.addMeeting)
  const setCurrentMeetingId = useAppStore(s => s.setCurrentMeetingId)

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const defaultStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    meetingType: 'offline' as MeetingType,
    status: 'scheduled' as MeetingStatus,
    startTime: defaultStart,
    endTime: '',
    participants: ''
  })

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title.trim()) {
      alert('请填写会议标题')
      return
    }
    if (!form.startTime) {
      alert('请选择开始时间')
      return
    }
    const startTime = form.startTime.replace('T', ' ') + ':00'
    const endTime = form.endTime ? form.endTime.replace('T', ' ') + ':00' : undefined
    let duration: number | undefined
    if (endTime) {
      duration = Math.round((new Date(form.endTime).getTime() - new Date(form.startTime).getTime()) / 60000)
    }

    const meeting = await window.api.meetings.create({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      meetingType: form.meetingType,
      status: form.status,
      startTime,
      endTime,
      duration,
      isLocked: 0
    })
    addMeeting(meeting)
    setCurrentMeetingId(meeting.id)

    if (form.participants.trim()) {
      const names = form.participants.split(/[,，;；\n]/).map(s => s.trim()).filter(Boolean)
      for (let i = 0; i < names.length; i++) {
        await window.api.participants.create({
          meetingId: meeting.id,
          name: names[i],
          role: i === 0 ? '主持人' : '参会人',
          isHost: i === 0 ? 1 : 0
        })
      }
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-lg">新建会议</h2>
          <button onClick={onClose} className="btn-ghost p-1 !px-1.5 !py-1">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">会议标题 <span className="text-red-500">*</span></label>
            <input
              value={form.title}
              onChange={e => update('title', e.target.value)}
              className="input"
              placeholder="如：Q2 产品规划评审会"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">会议描述</label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              className="textarea"
              rows={3}
              placeholder="简要说明会议背景和目标"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">会议类型</label>
              <select value={form.meetingType} onChange={e => update('meetingType', e.target.value)} className="select">
                <option value="offline">线下会议</option>
                <option value="online">线上会议</option>
                <option value="hybrid">线上+线下</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">会议状态</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className="select">
                <option value="scheduled">待开始</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">会议地点</label>
            <input
              value={form.location}
              onChange={e => update('location', e.target.value)}
              className="input"
              placeholder="如：3号会议室 / 腾讯会议链接"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">开始时间 <span className="text-red-500">*</span></label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={e => update('startTime', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">结束时间</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={e => update('endTime', e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">参会人</label>
            <textarea
              value={form.participants}
              onChange={e => update('participants', e.target.value)}
              className="textarea"
              rows={2}
              placeholder="多个姓名用逗号或换行分隔，第一个将自动设为主持人"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={submit} className="btn-primary">创建会议</button>
        </div>
      </div>
    </div>
  )
}
