import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Mic, MicOff, Pause, Play, Square, Upload,
  Volume2, Tag, Users, Clock, Search, Download, Sparkles,
  ChevronDown, ChevronUp, Edit3, Check, X, Trash2, Eye, Plus
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn, formatDuration, formatDateTime, safeParseJSON, avatarColor } from '@/utils'
import type { TranscriptSegment, Participant, Meeting } from '@/types'

const SPEAKER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
]

const MOCK_TRANSCRIPTS = [
  { speaker: '张明', content: '大家好，今天我们来讨论 Q2 的产品规划，首先请产品总监李华给大家介绍一下整体思路。' },
  { speaker: '李华', content: '好的，根据市场部最新的数据反馈，用户对性能体验的抱怨在过去一个月上升了 30%，所以我们把 Q2 的核心主题定为"体验优先"。' },
  { speaker: '王芳', content: '技术这边完全支持。我们盘点了一下，首屏加载慢、长列表卡顿、接口超时是 Top 3 问题。' },
  { speaker: '陈伟', content: '我补充一下，前端这边首屏主要是包体积太大，目前首屏资源有 1.8MB，建议做路由级代码分割。' },
  { speaker: '刘洋', content: '后端这边，核心查询接口平均响应 1.2s，加 Redis 缓存后预期可以降到 200ms 以内。' },
  { speaker: '赵敏', content: '测试这边建议建立性能基线，每次发版都做回归对比，避免越优化越慢。' },
  { speaker: '孙丽', content: '设计这边也发现，有些动效虽然好看，但低端机型掉帧严重，需要做降级方案。' },
  { speaker: '张明', content: '大家的分析都很到位。那我们先把性能专项立项，王芳牵头，下周一出详细方案。' },
  { speaker: '李华', content: '另外，新功能的优先级要重新排一下，非核心的先延后，保证性能优化资源。' },
  { speaker: '王芳', content: '好的，我整理一份技术方案和排期，同步到项目组。需要前后端各出 2 人全勤投入。' },
  { speaker: '张明', content: '没问题，资源我来协调。大家还有其他补充吗？' },
  { speaker: '陈伟', content: '建议引入性能监控平台，这样上线后也能持续观察。' },
  { speaker: '张明', content: '不错，把这个也加到方案里。今天会议就到这里，散会。' }
]

const KEYWORDS_POOL = ['性能优化', '首屏加载', 'Redis 缓存', '代码分割', '技术方案', '项目排期', '资源协调', '性能监控']

export default function Recording() {
  const { meetingId } = useParams()
  const navigate = useNavigate()
  const mid = Number(meetingId)
  const meetings = useAppStore(s => s.meetings)
  const setCurrentMeetingId = useAppStore(s => s.setCurrentMeetingId)

  const meeting = meetings.find(m => m.id === mid) as Meeting | undefined

  const [participants, setParticipants] = useState<Participant[]>([])
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [keywordList, setKeywordList] = useState<string[]>(['性能优化', 'Redis 缓存', '技术方案'])
  const [showKeywordPanel, setShowKeywordPanel] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)
  const [currentSpeaker, setCurrentSpeaker] = useState('张明')
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false)
  const [waveform, setWaveform] = useState<number[]>(Array(40).fill(20))
  const [searchText, setSearchText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const timerRef = useRef<number | null>(null)
  const waveRef = useRef<number | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentMeetingId(mid)
    ;(async () => {
      const [ps, segs] = await Promise.all([
        window.api.participants.getByMeeting(mid),
        window.api.transcripts.getByMeeting(mid)
      ])
      setParticipants(ps as Participant[])
      setSegments(segs as TranscriptSegment[])
      if (ps.length > 0) setCurrentSpeaker(ps[0].name)
    })()
  }, [mid])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [segments.length])

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000)
      waveRef.current = window.setInterval(() => {
        setWaveform(prev => prev.map((_, i) => 15 + Math.random() * 60 + Math.sin((Date.now() + i * 200) / 300) * 15))
      }, 80)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (waveRef.current) clearInterval(waveRef.current)
      setWaveform(prev => prev.map(() => 20))
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (waveRef.current) clearInterval(waveRef.current)
    }
  }, [status])

  const startRecording = () => {
    setStatus('recording')
  }
  const pauseRecording = () => setStatus('paused')
  const resumeRecording = () => setStatus('recording')
  const stopRecording = () => {
    setStatus('idle')
  }

  const simulateTranscript = async () => {
    if (status !== 'recording') return
    setIsGenerating(true)
    const startIdx = segments.length
    const nextBatch = MOCK_TRANSCRIPTS.slice(startIdx, startIdx + 3)
    if (nextBatch.length === 0) {
      setIsGenerating(false)
      return
    }
    const baseTime = elapsed
    const newSegs = nextBatch.map((s, i) => {
      const color = SPEAKER_COLORS[participants.findIndex(p => p.name === s.speaker) % SPEAKER_COLORS.length] || SPEAKER_COLORS[0]
      const kws = KEYWORDS_POOL.filter(k => s.content.includes(k))
      return {
        meetingId: mid,
        speaker: s.speaker,
        speakerColor: color,
        content: s.content,
        startTime: baseTime + i * 30,
        endTime: baseTime + i * 30 + 25,
        keywords: kws.length ? JSON.stringify(kws) : undefined
      }
    })
    await window.api.transcripts.createBatch(newSegs)
    const updated = await window.api.transcripts.getByMeeting(mid)
    setSegments(updated as TranscriptSegment[])
    setIsGenerating(false)
  }

  const importAudio = async () => {
    const res = await window.api.dialog.openFile([{ name: '音频文件', extensions: ['mp3', 'wav', 'm4a', 'aac', 'flac'] }])
    if (res.canceled || res.filePaths.length === 0) return
    const fp = res.filePaths[0]
    if (!confirm(`导入音频文件并模拟转写？\n${fp}`)) return
    setIsGenerating(true)
    const allSegs = MOCK_TRANSCRIPTS.map((s, i) => {
      const color = SPEAKER_COLORS[participants.findIndex(p => p.name === s.speaker) % SPEAKER_COLORS.length] || SPEAKER_COLORS[0]
      const kws = KEYWORDS_POOL.filter(k => s.content.includes(k))
      return {
        meetingId: mid,
        speaker: s.speaker,
        speakerColor: color,
        content: s.content,
        startTime: i * 30,
        endTime: i * 30 + 25,
        keywords: kws.length ? JSON.stringify(kws) : undefined
      }
    })
    await window.api.transcripts.deleteByMeeting(mid)
    await window.api.transcripts.createBatch(allSegs)
    const updated = await window.api.transcripts.getByMeeting(mid)
    setSegments(updated as TranscriptSegment[])
    setIsGenerating(false)
  }

  const addKeyword = () => {
    const k = keyword.trim()
    if (!k || keywordList.includes(k)) return
    setKeywordList(l => [...l, k])
    setKeyword('')
  }
  const removeKeyword = (k: string) => setKeywordList(l => l.filter(x => x !== k))

  const startEdit = (s: TranscriptSegment) => {
    setEditingId(s.id)
    setEditValue(s.content)
  }
  const saveEdit = async (s: TranscriptSegment) => {
    await window.api.transcripts.update(s.id, { content: editValue })
    const updated = await window.api.transcripts.getByMeeting(mid)
    setSegments(updated as TranscriptSegment[])
    setEditingId(null)
    setEditValue('')
  }

  const deleteSegment = async (id: number) => {
    if (!confirm('删除此条转写？')) return
    const rest = segments.filter(s => s.id !== id)
    await window.api.transcripts.deleteByMeeting(mid)
    if (rest.length > 0) {
      await window.api.transcripts.createBatch(rest.map(s => ({
        meetingId: mid,
        speaker: s.speaker,
        speakerColor: s.speakerColor,
        content: s.content,
        startTime: s.startTime,
        endTime: s.endTime,
        keywords: s.keywords
      })))
    }
    const updated = await window.api.transcripts.getByMeeting(mid)
    setSegments(updated as TranscriptSegment[])
  }

  const filteredSegments = useMemo(() => {
    if (!searchText.trim()) return segments
    return segments.filter(s => s.content.includes(searchText.trim()) || (s.speaker || '').includes(searchText.trim()))
  }, [segments, searchText])

  const speakerStats = useMemo(() => {
    const map: Record<string, { count: number; duration: number }> = {}
    segments.forEach(s => {
      const name = s.speaker || '未知'
      if (!map[name]) map[name] = { count: 0, duration: 0 }
      map[name].count += 1
      map[name].duration += (s.endTime || 0) - (s.startTime || 0)
    })
    return Object.entries(map).map(([name, v]) => ({ name, ...v }))
  }, [segments])

  const highlightContent = (content: string, keywords: string[]) => {
    const allKws = [...keywordList, ...keywords]
    if (allKws.length === 0) return content
    let result: any[] = [content]
    allKws.forEach(kw => {
      if (!kw) return
      result = result.flatMap(part => {
        if (typeof part !== 'string') return part
        const parts = part.split(new RegExp(`(${kw})`, 'gi'))
        return parts.map(p => p.toLowerCase() === kw.toLowerCase()
          ? <mark key={kw + Math.random()} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{p}</mark>
          : p
        )
      })
    })
    return result
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate(-1)} className="btn-ghost text-slate-300 hover:bg-slate-800 !px-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{meeting?.title || '录音窗口'}</h1>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            {meeting && <span>{formatDateTime(meeting.startTime)}</span>}
            <span className={cn(
              'inline-flex items-center gap-1',
              status === 'recording' ? 'text-red-400' : status === 'paused' ? 'text-amber-400' : 'text-slate-400'
            )}>
              {status === 'recording' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              {status === 'idle' ? '未录制' : status === 'recording' ? '录制中' : '已暂停'}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSpeakerMenu(s => !s)}
            className="btn-secondary text-slate-800 !py-1 inline-flex items-center gap-2"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: SPEAKER_COLORS[(participants.findIndex(p => p.name === currentSpeaker) + 10) % SPEAKER_COLORS.length] || SPEAKER_COLORS[0] }}
            >{currentSpeaker.charAt(0)}</div>
            <span>{currentSpeaker}</span>
            <ChevronDown size={14} />
          </button>
          {showSpeakerMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-20">
              {participants.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">请先添加参会人</div>
              ) : participants.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setCurrentSpeaker(p.name); setShowSpeakerMenu(false) }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-700 transition',
                    p.name === currentSpeaker && 'bg-slate-700/60'
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px]"
                    style={{ background: avatarColor(p.name) }}
                  >{p.name.charAt(0)}</div>
                  <span>{p.name}</span>
                  {p.role && <span className="text-xs text-slate-400 ml-auto">{p.role}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={importAudio} className="btn-secondary text-slate-800 !py-1">
          <Upload size={14} /> 导入音频
        </button>
      </header>

      <div className="px-6 py-4 bg-gradient-to-b from-slate-900 to-slate-900/60 border-b border-slate-800 shrink-0">
        <div className="flex items-end gap-1 h-16 mb-4 px-2">
          {waveform.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all duration-75"
              style={{
                height: `${Math.max(6, h)}%`,
                background: status === 'recording'
                  ? `linear-gradient(to top, #3b82f6, #8b5cf6)`
                  : '#334155'
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="text-3xl font-mono font-bold text-center min-w-[140px] tabular-nums">
            <Clock size={16} className="inline mr-1 -mt-1 text-slate-400" />
            {formatDuration(elapsed)}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          {status === 'idle' ? (
            <button
              onClick={startRecording}
              className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium inline-flex items-center gap-2 shadow-lg shadow-red-600/30 transition"
            >
              <Mic size={18} /> 开始录音
            </button>
          ) : (
            <>
              {status === 'recording' ? (
                <button
                  onClick={pauseRecording}
                  className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-medium inline-flex items-center gap-2 shadow-lg transition"
                >
                  <Pause size={18} /> 暂停
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-medium inline-flex items-center gap-2 shadow-lg transition"
                >
                  <Play size={18} /> 续录
                </button>
              )}
              <button
                onClick={simulateTranscript}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-medium inline-flex items-center gap-2 shadow-lg transition disabled:opacity-60"
              >
                <Sparkles size={18} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'AI 转写中...' : '模拟 AI 转写'}
              </button>
              <button
                onClick={stopRecording}
                className="px-5 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-medium inline-flex items-center gap-2 transition"
              >
                <Square size={18} /> 结束
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-3 shrink-0">
            <div className="flex-1 max-w-md relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="搜索转写内容..."
                className="w-full px-8 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              共 {segments.length} 条，匹配 {filteredSegments.length} 条
            </div>
            <button
              onClick={() => setShowKeywordPanel(s => !s)}
              className={cn(
                'ml-auto px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition',
                showKeywordPanel
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              )}
            >
              <Tag size={12} /> 关键词标记
              {showKeywordPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {showKeywordPanel && (
            <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">自定义关键词：</span>
                {keywordList.map(k => (
                  <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                    {k}
                    <button onClick={() => removeKeyword(k)} className="hover:text-yellow-200">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1">
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    placeholder="添加关键词"
                    className="w-28 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button onClick={addKeyword} className="px-2 py-0.5 rounded bg-primary-600 text-white text-xs hover:bg-primary-700">
                    <Plus size={10} />
                  </button>
                </div>
                <div className="ml-auto text-xs text-slate-500">关键词将在转写中自动高亮标注</div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-4">
            {filteredSegments.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                {isGenerating ? (
                  <div className="text-center">
                    <Sparkles size={32} className="mx-auto mb-2 animate-spin text-primary-400" />
                    <div>AI 正在努力转写...</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <MicOff size={40} className="mx-auto mb-3 text-slate-600" />
                    <div className="text-slate-400">暂无转写内容</div>
                    <div className="text-xs text-slate-600 mt-1">点击"开始录音"或"导入音频"开始</div>
                  </div>
                )}
              </div>
            ) : filteredSegments.map((s, idx) => {
              const prevSpeaker = filteredSegments[idx - 1]?.speaker
              const isNewSpeaker = s.speaker !== prevSpeaker
              const kws = safeParseJSON<string[]>(s.keywords, [])

              return (
                <div
                  key={s.id}
                  className={cn(
                    'group relative rounded-lg transition',
                    selectedSegment === s.id && 'bg-primary-900/20 ring-1 ring-primary-700/40',
                    'hover:bg-slate-800/40'
                  )}
                  onClick={() => setSelectedSegment(s.id)}
                >
                  {isNewSpeaker && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                        style={{ background: s.speakerColor || avatarColor(s.speaker || '?') }}
                      >
                        {(s.speaker || '?').charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: s.speakerColor || '#cbd5e1' }}>
                          {s.speaker || '未知说话人'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock size={10} /> {formatDuration(s.startTime)} - {formatDuration(s.endTime)}
                        </div>
                      </div>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                        {editingId === s.id ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); saveEdit(s) }}
                              className="p-1 rounded hover:bg-green-600/30 text-green-400"
                              title="保存"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingId(null); setEditValue('') }}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400"
                              title="取消"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(s) }}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400"
                              title="编辑"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteSegment(s.id) }}
                              className="p-1 rounded hover:bg-red-600/30 text-red-400"
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pl-10">
                    {editingId === s.id && isNewSpeaker === false ? null : null}
                    {editingId === s.id ? (
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onBlur={() => saveEdit(s)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(s)
                          if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                        }}
                        className="w-full p-2 rounded-md bg-slate-800 border border-primary-600/50 text-sm text-slate-100 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm leading-relaxed text-slate-200">
                        {highlightContent(s.content, kws)}
                      </p>
                    )}
                    {kws.length > 0 && (
                      <div className="mt-1.5 flex gap-1 flex-wrap">
                        {kws.map(k => (
                          <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            <Tag size={8} /> {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        <aside className="w-72 border-l border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Users size={14} className="text-primary-400" /> 说话人统计
            </h3>
            {speakerStats.length === 0 ? (
              <div className="text-xs text-slate-500">暂无数据</div>
            ) : (
              <div className="space-y-2">
                {speakerStats.map(ss => (
                  <div key={ss.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: SPEAKER_COLORS[participants.findIndex(p => p.name === ss.name) % SPEAKER_COLORS.length] || '#64748b' }}
                        />
                        {ss.name}
                      </span>
                      <span className="text-slate-400">{ss.count} 次 · {formatDuration(ss.duration)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (ss.duration / Math.max(1, segments.reduce((a, s) => a + ((s.endTime || 0) - (s.startTime || 0)), 0))) * 100)}%`,
                          background: SPEAKER_COLORS[participants.findIndex(p => p.name === ss.name) % SPEAKER_COLORS.length] || '#64748b'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-b border-slate-800">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Tag size={14} className="text-yellow-400" /> 关键词热度
            </h3>
            {keywordList.length === 0 ? (
              <div className="text-xs text-slate-500">暂无关键词</div>
            ) : (
              <div className="space-y-1.5">
                {keywordList.map(k => {
                  const cnt = segments.filter(s => s.content.includes(k)).length
                  return (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{k}</span>
                      <span className="text-slate-500">{cnt} 次</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Volume2 size={14} className="text-green-400" /> 音频信息
            </h3>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between"><span>录音时长</span><span className="text-slate-200">{formatDuration(elapsed)}</span></div>
              <div className="flex justify-between"><span>转写条数</span><span className="text-slate-200">{segments.length}</span></div>
              <div className="flex justify-between"><span>总字数</span><span className="text-slate-200">{segments.reduce((a, s) => a + s.content.length, 0)}</span></div>
              <div className="flex justify-between"><span>采样率</span><span className="text-slate-200">16 kHz</span></div>
              <div className="flex justify-between"><span>声道</span><span className="text-slate-200">单声道</span></div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={() => navigate(`/minutes/${mid}`)}
                className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition"
              >
                <Sparkles size={12} /> 生成会议纪要
              </button>
              <button className="w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-slate-700 transition">
                <Download size={12} /> 导出转写文本
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}


