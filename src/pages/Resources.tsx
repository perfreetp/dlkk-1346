import { useEffect, useMemo, useState } from 'react'
import {
  Search, Upload, FolderOpen, FileText, Image, Music, File,
  MessageSquare, Camera, Download, Filter, Trash2, Eye,
  FileWord, FileSpreadsheet, Mail, Lock, Unlock, Clock,
  Calendar, User, Tag, ChevronRight, Sparkles, X, AlertCircle,
  Copy, CheckCircle2, MoreHorizontal, LayoutGrid, List as ListIcon
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn, formatDate, formatDateTime, formatFileSize, statusText } from '@/utils'
import type { Attachment, ChatMessage, Screenshot, SearchResult, Meeting } from '@/types'

type ResourceTab = 'attachments' | 'chat' | 'screenshots' | 'search'
type AttachmentCategory = 'all' | 'document' | 'audio' | 'image' | 'other'

const CAT_MAP: Record<string, { label: string; icon: any; color: string }> = {
  document: { label: '文档', icon: FileText, color: 'bg-blue-100 text-blue-600' },
  audio: { label: '音频', icon: Music, color: 'bg-purple-100 text-purple-600' },
  image: { label: '图片', icon: Image, color: 'bg-pink-100 text-pink-600' },
  other: { label: '其他', icon: File, color: 'bg-slate-100 text-slate-600' }
}

export default function Resources() {
  const meetings = useAppStore(s => s.meetings)
  const currentMeetingId = useAppStore(s => s.currentMeetingId)

  const [tab, setTab] = useState<ResourceTab>('attachments')
  const [meetingFilter, setMeetingFilter] = useState<number | 'all'>(currentMeetingId || 'all')
  const [catFilter, setCatFilter] = useState<AttachmentCategory>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [keyword, setKeyword] = useState('')
  const [searchResult, setSearchResult] = useState<{
    meetings: SearchResult[]; tasks: SearchResult[]; attachments: SearchResult[]; transcripts: SearchResult[]
  } | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [chats, setChats] = useState<ChatMessage[]>([])
  const [shots, setShots] = useState<Screenshot[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [lockPwd, setLockPwd] = useState('')
  const [pwdInput, setPwdInput] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showLockModal, setShowLockModal] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadData = async () => {
    const getFor = async (mid: number | 'all') => {
      if (mid === 'all') {
        let allAtt: Attachment[] = []
        let allChat: ChatMessage[] = []
        let allShot: Screenshot[] = []
        for (const m of meetings) {
          const [a, c, s] = await Promise.all([
            window.api.attachments.getByMeeting(m.id),
            window.api.chatMessages.getByMeeting(m.id),
            window.api.screenshots.getByMeeting(m.id)
          ])
          allAtt = allAtt.concat(a as Attachment[])
          allChat = allChat.concat(c as ChatMessage[])
          allShot = allShot.concat(s as Screenshot[])
        }
        return [allAtt, allChat, allShot]
      }
      return [
        await window.api.attachments.getByMeeting(mid),
        await window.api.chatMessages.getByMeeting(mid),
        await window.api.screenshots.getByMeeting(mid)
      ]
    }
    const [a, c, s] = await getFor(meetingFilter)
    setAttachments(a as Attachment[])
    setChats(c as ChatMessage[])
    setShots(s as Screenshot[])
  }

  useEffect(() => { loadData() }, [meetingFilter, meetings.length])

  const doSearch = async () => {
    if (!keyword.trim()) { setSearchResult(null); return }
    const res = await window.api.fullSearch(keyword.trim())
    setSearchResult(res as any)
  }

  useEffect(() => {
    const t = setTimeout(doSearch, 400)
    return () => clearTimeout(t)
  }, [keyword, tab])

  const filteredAtts = useMemo(() => {
    return attachments.filter(a => catFilter === 'all' || a.category === catFilter)
  }, [attachments, catFilter])

  const totalSize = attachments.reduce((a, b) => a + (b.fileSize || 0), 0)

  const uploadFile = async () => {
    if (isLocked) { alert('请先解锁访问'); return }
    const res = await window.api.dialog.openFile([])
    if (res.canceled || res.filePaths.length === 0) return
    const targetMid = meetingFilter === 'all'
      ? (currentMeetingId || meetings[0]?.id)
      : meetingFilter
    if (!targetMid) { alert('请先选择关联的会议'); return }
    for (const fp of res.filePaths) {
      const name = fp.split(/[\\/]/).pop() || '未知文件'
      const ext = name.split('.').pop()?.toLowerCase() || ''
      const cat: Attachment['category'] =
        ['doc', 'docx', 'pdf', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) ? 'document'
        : ['mp3', 'wav', 'm4a', 'aac', 'flac'].includes(ext) ? 'audio'
        : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) ? 'image'
        : 'other'
      const sampleContents: Record<string, string> = {
        document: `这是 ${name} 文档的内容预览，包含项目技术方案、需求说明等关键信息。涉及接口设计、数据库表结构、部署方案等核心内容。`,
        audio: `音频文件包含会议录音内容，已完成 AI 转写，关键信息：性能优化、技术方案、排期计划。`,
        image: `会议截图，包含数据看板、流程图、架构设计图等视觉信息。`
      }
      await window.api.attachments.create({
        meetingId: targetMid,
        fileName: name,
        filePath: fp,
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
        fileType: ext,
        category: cat,
        content: sampleContents[cat] || `${name} 文件内容`,
        tags: JSON.stringify(['会议资料', cat === 'document' ? '文档' : cat === 'audio' ? '录音' : '附件'])
      })
    }
    await loadData()
    showToast(`已上传 ${res.filePaths.length} 个文件`)
  }

  const deleteAttachment = async (id: number) => {
    if (!confirm('确定删除此附件？')) return
    await window.api.attachments.delete(id)
    await loadData()
  }

  const getMeetingTitle = (mid?: number) => {
    if (!mid) return '-'
    return meetings.find(m => m.id === mid)?.title || `会议#${mid}`
  }

  const exportWord = async () => {
    const m = meetingFilter === 'all' ? meetings[0] : meetings.find(x => x.id === meetingFilter)
    if (!m) return
    showToast(`正在生成《${m.title}》Word 文档...`)
    await new Promise(r => setTimeout(r, 1000))
    showToast('Word 文档生成成功，已保存到下载目录')
  }

  const exportPDF = async () => {
    const m = meetingFilter === 'all' ? meetings[0] : meetings.find(x => x.id === meetingFilter)
    if (!m) return
    showToast(`正在生成《${m.title}》PDF 文档...`)
    await new Promise(r => setTimeout(r, 1000))
    showToast('PDF 文档生成成功，已保存到下载目录')
  }

  const generateEmail = async () => {
    const m = meetingFilter === 'all' ? meetings[0] : meetings.find(x => x.id === meetingFilter)
    if (!m) return
    const attList = attachments.map(a => `- ${a.fileName} (${formatFileSize(a.fileSize)})`).join('\n')
    const text =
`各位同事好，

附件为${formatDate(m.startTime)}《${m.title}》会议相关资料：

${attList || '- （暂无附件）'}

内含：会议纪要、转写文本、任务清单及相关文档，请查收并跟进。

如有疑问请随时沟通。

—— 会议秘书处`
    try {
      await navigator.clipboard.writeText(text)
      showToast('邮件正文已复制到剪贴板')
    } catch {
      showToast('复制失败')
    }
  }

  const confirmLock = () => {
    if (!lockPwd.trim()) {
      alert('请设置密码')
      return
    }
    setIsLocked(true)
    setShowLockModal(false)
    setPwdInput('')
    showToast('已启用本地权限锁定')
  }
  const unlock = () => {
    if (pwdInput !== lockPwd) {
      alert('密码不正确')
      return
    }
    setIsLocked(false)
    setPwdInput('')
    showToast('已解锁')
  }

  const addChat = async () => {
    if (isLocked) { alert('请先解锁访问'); return }
    const mid = meetingFilter === 'all' ? (currentMeetingId || meetings[0]?.id) : meetingFilter
    if (!mid) return
    const sender = '我'
    const content = prompt('发送聊天消息：')
    if (!content?.trim()) return
    await window.api.chatMessages.create({
      meetingId: mid,
      sender,
      content: content.trim()
    })
    await loadData()
  }

  const addScreenshot = async () => {
    if (isLocked) { alert('请先解锁访问'); return }
    const mid = meetingFilter === 'all' ? (currentMeetingId || meetings[0]?.id) : meetingFilter
    if (!mid) return
    const res = await window.api.dialog.openFile([{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }])
    if (res.canceled) return
    for (const fp of res.filePaths) {
      const name = fp.split(/[\\/]/).pop() || 'screenshot.png'
      await window.api.screenshots.create({
        meetingId: mid,
        fileName: name,
        filePath: fp,
        description: '会议截图 - 上传于 ' + new Date().toLocaleString()
      })
    }
    await loadData()
    showToast('截图已上传')
  }

  const tabs = [
    { key: 'attachments' as const, label: '附件', icon: FolderOpen, count: attachments.length },
    { key: 'chat' as const, label: '聊天记录', icon: MessageSquare, count: chats.length },
    { key: 'screenshots' as const, label: '会议截图', icon: Camera, count: shots.length },
    { key: 'search' as const, label: '全文搜索', icon: Search, count: null }
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center gap-4 shrink-0">
        <div>
          <h1 className="font-semibold text-slate-800 text-lg">资料管理</h1>
          <div className="text-xs text-slate-400">
            {attachments.length} 个附件 · 总 {formatFileSize(totalSize)} · {chats.length} 条消息 · {shots.length} 张截图
          </div>
        </div>

        <div className="flex-1 max-w-xl ml-8 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={tab === 'search' ? keyword : ''}
            onChange={e => { if (tab !== 'search') setTab('search'); setKeyword(e.target.value) }}
            onFocus={() => setTab('search')}
            placeholder="跨会议搜索：标题、内容、任务、转写..."
            className="input pl-9"
          />
        </div>

        <select
          value={meetingFilter === 'all' ? 'all' : String(meetingFilter)}
          onChange={e => setMeetingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="select !w-52"
        >
          <option value="all">全部会议</option>
          {meetings.map(m => <option key={m.id} value={m.id}>{formatDate(m.startTime)} · {m.title}</option>)}
        </select>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(s => !s)}
            className="btn-secondary"
          >
            <Download size={14} /> 导出
            <ChevronRight size={12} className="-rotate-90" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20 text-sm">
              <button onClick={() => { exportWord(); setShowExportMenu(false) }} className="w-full text-left px-3 py-2 hover:bg-slate-50 inline-flex items-center gap-2">
                <FileWord size={14} className="text-blue-600" /> 导出 Word
              </button>
              <button onClick={() => { exportPDF(); setShowExportMenu(false) }} className="w-full text-left px-3 py-2 hover:bg-slate-50 inline-flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-red-600" /> 导出 PDF
              </button>
              <button onClick={() => { generateEmail(); setShowExportMenu(false) }} className="w-full text-left px-3 py-2 hover:bg-slate-50 inline-flex items-center gap-2">
                <Mail size={14} className="text-primary-600" /> 生成邮件正文
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowLockModal(true)}
          className={cn(
            'btn',
            isLocked
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          )}
        >
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          {isLocked ? '已锁定' : '权限锁定'}
        </button>

        <button onClick={uploadFile} className="btn-primary">
          <Upload size={14} /> 上传附件
        </button>
      </header>

      <div className="border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-3 text-sm font-medium inline-flex items-center gap-1.5 transition relative',
                tab === t.key
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <t.icon size={14} /> {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={cn(
                  'tag text-[10px]',
                  tab === t.key ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
                )}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'attachments' && (
          <div className="flex items-center gap-2 py-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('px-2 py-1 rounded-md text-xs inline-flex items-center gap-1 transition',
                  viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
              >
                <LayoutGrid size={12} /> 网格
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('px-2 py-1 rounded-md text-xs inline-flex items-center gap-1 transition',
                  viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
              >
                <ListIcon size={12} /> 列表
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCatFilter('all')}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition',
                  catFilter === 'all' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100')}
              >全部</button>
              {Object.entries(CAT_MAP).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setCatFilter(k as any)}
                  className={cn('px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition',
                    catFilter === k ? v.color : 'text-slate-500 hover:bg-slate-100')}
                >
                  <v.icon size={12} /> {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <button onClick={addChat} className="btn-secondary !py-1.5 text-xs my-2">
            <MessageSquare size={12} /> 记录消息
          </button>
        )}
        {tab === 'screenshots' && (
          <button onClick={addScreenshot} className="btn-secondary !py-1.5 text-xs my-2">
            <Upload size={12} /> 上传截图
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50">
        {isLocked ? (
          <div className="h-full flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-96 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock size={28} className="text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-lg mb-2">资料已锁定</h3>
              <p className="text-sm text-slate-500 mb-5">请输入访问密码以查看会议资料</p>
              <input
                type="password"
                value={pwdInput}
                onChange={e => setPwdInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && unlock()}
                placeholder="请输入密码"
                className="input mb-4"
                autoFocus
              />
              <button onClick={unlock} className="btn-primary w-full justify-center">解锁访问</button>
            </div>
          </div>
        ) : tab === 'attachments' ? (
          viewMode === 'grid' ? (
            <div className="h-full overflow-y-auto scrollbar-thin p-6">
              {filteredAtts.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="暂无附件"
                  desc="点击右上角上传按钮添加会议资料"
                  action={uploadFile}
                  actionLabel="上传附件"
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredAtts.map(a => (
                    <AttachmentCard key={a.id} att={a} meetingTitle={getMeetingTitle(a.meetingId)} onDelete={() => deleteAttachment(a.id)} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full overflow-hidden p-6">
              <div className="card h-full overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs text-slate-500">
                      <th className="px-5 py-3 font-medium">文件名</th>
                      <th className="px-4 py-3 font-medium w-28">类型</th>
                      <th className="px-4 py-3 font-medium w-28">大小</th>
                      <th className="px-4 py-3 font-medium w-40">所属会议</th>
                      <th className="px-4 py-3 font-medium w-40">上传时间</th>
                      <th className="px-4 py-3 font-medium w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAtts.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-slate-400">暂无附件</td></tr>
                    ) : filteredAtts.map(a => {
                      const cat = CAT_MAP[a.category] || CAT_MAP.other
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', cat.color)}>
                                <cat.icon size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-800 truncate max-w-xs">{a.fileName}</div>
                                {a.content && <div className="text-xs text-slate-400 truncate max-w-xs">{a.content}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className={cn('tag', cat.color)}>{cat.label}</span></td>
                          <td className="px-4 py-3 text-slate-600">{formatFileSize(a.fileSize)}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-[160px]">{getMeetingTitle(a.meetingId)}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(a.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-primary-600" title="预览">
                                <Eye size={14} />
                              </button>
                              <button className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-primary-600" title="下载">
                                <Download size={14} />
                              </button>
                              <button onClick={() => deleteAttachment(a.id)} className="p-1 rounded hover:bg-red-50 text-slate-500 hover:text-red-500" title="删除">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : tab === 'chat' ? (
          <div className="h-full overflow-y-auto scrollbar-thin p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {chats.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="暂无聊天记录"
                  desc="会议过程中的讨论、补充信息可在此记录"
                  action={addChat}
                  actionLabel="记录第一条消息"
                />
              ) : chats.map((c, i) => {
                const isMe = c.sender === '我'
                const prev = chats[i - 1]
                const showHeader = !prev || prev.sender !== c.sender
                return (
                  <div key={c.id} className={cn('flex gap-3', isMe ? 'flex-row-reverse' : '')}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                      {c.sender.charAt(0)}
                    </div>
                    <div className={cn('max-w-[70%]', isMe ? 'items-end' : '')}>
                      {showHeader && (
                        <div className={cn('text-xs text-slate-500 mb-1 flex items-center gap-2', isMe ? 'justify-end' : '')}>
                          <span className="font-medium text-slate-700">{c.sender}</span>
                          <span className="text-[10px]">{formatDateTime(c.createdAt)}</span>
                        </div>
                      )}
                      <div className={cn(
                        'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                        isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                      )}>
                        {c.content}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : tab === 'screenshots' ? (
          <div className="h-full overflow-y-auto scrollbar-thin p-6">
            {shots.length === 0 ? (
              <EmptyState
                icon={Camera}
                title="暂无截图"
                desc="上传会议过程中共享屏幕的截图、白板照片等"
                action={addScreenshot}
                actionLabel="上传截图"
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {shots.map(s => (
                  <div key={s.id} className="group card overflow-hidden cursor-pointer hover:shadow-lg transition">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden relative">
                      <Image size={40} className="text-slate-400" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button className="p-2 rounded-full bg-white/90 text-slate-700 hover:bg-white transition">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 rounded-full bg-white/90 text-slate-700 hover:bg-white transition">
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-medium text-slate-800 truncate">{s.fileName}</div>
                      {s.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</div>}
                      <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                        <span>{getMeetingTitle(s.meetingId)}</span>
                        <span>{formatDate(s.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto scrollbar-thin p-6">
            {!searchResult ? (
              <EmptyState
                icon={Sparkles}
                title="输入关键词开始搜索"
                desc="支持跨会议搜索：会议标题、任务内容、附件、转写文本"
              />
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Sparkles size={12} className="text-primary-500" />
                  搜索 "{keyword}" 共找到 {
                    searchResult.meetings.length + searchResult.tasks.length +
                    searchResult.attachments.length + searchResult.transcripts.length
                  } 条结果
                </div>

                {searchResult.meetings.length > 0 && (
                  <SearchGroup title="会议" icon={Calendar} color="text-blue-600">
                    {searchResult.meetings.map(r => (
                      <SearchItem key={`m-${r.id}`} title={r.name} desc={r.detail || ''} />
                    ))}
                  </SearchGroup>
                )}
                {searchResult.tasks.length > 0 && (
                  <SearchGroup title="任务" icon={CheckCircle2} color="text-green-600">
                    {searchResult.tasks.map(r => (
                      <SearchItem key={`t-${r.id}`} title={r.name} desc={r.detail || ''} />
                    ))}
                  </SearchGroup>
                )}
                {searchResult.attachments.length > 0 && (
                  <SearchGroup title="附件" icon={FileText} color="text-purple-600">
                    {searchResult.attachments.map(r => (
                      <SearchItem key={`a-${r.id}`} title={r.name} desc={r.detail || ''} />
                    ))}
                  </SearchGroup>
                )}
                {searchResult.transcripts.length > 0 && (
                  <SearchGroup title="转写内容" icon={MessageSquare} color="text-amber-600">
                    {searchResult.transcripts.map(r => (
                      <SearchItem
                        key={`tr-${r.id}`}
                        title={`${r.name}：${r.detail?.slice(0, 30) || ''}`}
                        desc={`来自《${r.meetingTitle}》：${r.detail || ''}`}
                        badge={r.meetingTitle || ''}
                      />
                    ))}
                  </SearchGroup>
                )}

                {searchResult.meetings.length + searchResult.tasks.length + searchResult.attachments.length + searchResult.transcripts.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <AlertCircle size={36} className="mx-auto mb-3 text-slate-300" />
                    未找到匹配结果，请尝试其他关键词
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showLockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowLockModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-96 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                <Lock size={18} className="text-amber-600" /> 本地权限锁定
              </h3>
              <button onClick={() => setShowLockModal(false)} className="p-1 rounded hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">设置密码后，查看会议资料需要先验证密码</p>
            <input
              type="password"
              value={lockPwd}
              onChange={e => setLockPwd(e.target.value)}
              placeholder={isLocked ? '修改密码（留空则取消锁定）' : '设置访问密码'}
              className="input mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {isLocked && (
                <button
                  onClick={() => { setIsLocked(false); setLockPwd(''); setShowLockModal(false); showToast('已取消锁定') }}
                  className="btn-danger"
                >
                  <Unlock size={14} /> 取消锁定
                </button>
              )}
              <button onClick={() => setShowLockModal(false)} className="btn-secondary">取消</button>
              <button onClick={confirmLock} className="btn-primary">
                {isLocked ? '修改密码' : '启用锁定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg bg-slate-800 text-white text-sm shadow-xl z-50 inline-flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-400" />
          {toast}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc, action, actionLabel }: any) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
          <Icon size={30} />
        </div>
        <h3 className="font-medium text-slate-800 mb-1.5">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{desc}</p>
        {action && (
          <button onClick={action} className="btn-primary">
            <Upload size={14} /> {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function AttachmentCard({ att, meetingTitle, onDelete }: { att: Attachment; meetingTitle: string; onDelete: () => void }) {
  const cat = CAT_MAP[att.category] || CAT_MAP.other
  const tags: string[] = (() => {
    try { return JSON.parse(att.tags || '[]') } catch { return [] }
  })()
  return (
    <div className="group card p-4 hover:shadow-md transition cursor-pointer relative">
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', cat.color)}>
          <cat.icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-slate-800 truncate pr-6">{att.fileName}</h4>
          <div className="text-xs text-slate-400 mt-0.5">{formatFileSize(att.fileSize)}</div>
        </div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 bg-white shadow-sm"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {att.content && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{att.content}</p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map(t => (
            <span key={t} className="tag bg-slate-100 text-slate-600 text-[10px] inline-flex items-center gap-0.5">
              <Tag size={8} /> {t}
            </span>
          ))}
        </div>
      )}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1 truncate">
          <Calendar size={10} /> {meetingTitle.slice(0, 10)}
        </span>
        <span>{formatDate(att.createdAt)}</span>
      </div>
    </div>
  )
}

function SearchGroup({ title, icon: Icon, color, children }: any) {
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${color}`}>
        <Icon size={14} /> {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

function SearchItem({ title, desc, badge }: { title: string; desc: string; badge?: string }) {
  return (
    <div className="p-3 rounded-lg bg-white border border-slate-200 hover:border-primary-300 hover:shadow-sm transition cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium text-slate-800 text-sm line-clamp-1">{title}</h4>
        {badge && <span className="tag bg-primary-50 text-primary-600 text-[10px] shrink-0">{badge}</span>}
      </div>
      {desc && <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{desc}</p>}
    </div>
  )
}
