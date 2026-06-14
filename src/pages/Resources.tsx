import { useEffect, useMemo, useState } from 'react'
import {
  Search, Upload, FolderOpen, FileText, Image, Music, File,
  MessageSquare, Camera, Download, Filter, Trash2, Eye,
  FileWord, FileSpreadsheet, Mail, Lock, Unlock, Clock,
  Calendar, User, Tag, ChevronRight, Sparkles, X, AlertCircle,
  Copy, CheckCircle2, MoreHorizontal, LayoutGrid, List as ListIcon,
  Package, FolderDown, ExternalLink
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn, formatDate, formatDateTime, formatFileSize, statusText } from '@/utils'
import type { Attachment, ChatMessage, Screenshot, SearchResult, Meeting } from '@/types'

type ResourceTab = 'attachments' | 'chat' | 'screenshots' | 'search' | 'history'
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
  const isLocked = useAppStore(s => s.isResourcesLocked)
  const lockPassword = useAppStore(s => s.lockPassword)
  const enableLock = useAppStore(s => s.enableLock)
  const disableLock = useAppStore(s => s.disableLock)
  const unlockResources = useAppStore(s => s.unlockResources)
  const setResourcesLocked = useAppStore(s => s.setResourcesLocked)

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
  const [pwdInput, setPwdInput] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showLockModal, setShowLockModal] = useState(false)
  const [lockFormPwd, setLockFormPwd] = useState('')
  const [toast, setToast] = useState('')
  const [exportRecords, setExportRecords] = useState<any[]>([])

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

  const loadExportRecords = async () => {
    try {
      const list = await window.api.exportRecords.list(50)
      setExportRecords(list as any[])
    } catch (e) {
      console.warn('Load export records failed:', e)
    }
  }

  const addExportRecord = async (m: Meeting, format: string, filePath: string, fileSize?: number) => {
    try {
      await window.api.exportRecords.create({
        meetingId: m.id, meetingTitle: m.title, format, filePath, fileSize
      })
      await loadExportRecords()
    } catch (e) { /* ignore */ }
  }

  useEffect(() => { loadData(); loadExportRecords() }, [meetingFilter, meetings.length])

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

  const buildMeetingReport = async (m: Meeting) => {
    const [parts, agendas, mins, tasks, atts, transcripts, chats, shots] = await Promise.all([
      window.api.participants.getByMeeting(m.id),
      window.api.agendas.getByMeeting(m.id),
      window.api.minutes.getByMeeting(m.id),
      window.api.tasks.getByMeeting(m.id),
      window.api.attachments.getByMeeting(m.id),
      window.api.transcripts.getByMeeting(m.id),
      window.api.chatMessages.getByMeeting(m.id),
      window.api.screenshots.getByMeeting(m.id)
    ])
    return { meeting: m, participants: parts, agendas, minutes: mins, tasks, attachments: atts, transcripts, chats, screenshots: shots }
  }

  const exportWord = async () => {
    const m = meetingFilter === 'all' ? meetings[0] : meetings.find(x => x.id === meetingFilter)
    if (!m) { alert('请选择会议'); return }
    showToast(`正在生成《${m.title}》Word 文档...`)
    try {
      const data = await buildMeetingReport(m)
      const {
        Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
        Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
        LevelFormat
      } = await import('docx')

      const h = (txt: string, level: any) => new Paragraph({
        text: txt, heading: level, spacing: { before: 300, after: 180 }
      })
      const p = (runs: any[], opts?: any) => new Paragraph({
        children: Array.isArray(runs) ? runs : [new TextRun(runs as any)],
        spacing: { after: 80 },
        ...opts
      })
      const run = (txt: string, opts?: any) => new TextRun({ text: txt, ...opts })
      const border = { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' }
      const headerShading = { type: ShadingType.CLEAR, fill: 'F1F5F9', color: 'auto' }

      const children: any[] = []

      children.push(new Paragraph({
        text: m.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 500 }
      }))

      children.push(p([run('会议时间：', { bold: true }), run(`${formatDateTime(m.startTime)}${m.endTime ? ' ~ ' + formatDateTime(m.endTime) : ''}`)]))
      children.push(p([run('会议地点：', { bold: true }), run(m.location || '-')]))
      children.push(p([run('参会人员：', { bold: true }), run(data.participants.map(p => `${p.name}${p.isHost ? '（主持人）' : ''}${p.role ? `【${p.role}】` : ''}`).join('、') || '-')], { spacing: { after: 400 } }))

      children.push(h('一、会议摘要', HeadingLevel.HEADING_1))
      if (data.minutes?.summary) {
        const summaries: string[] = JSON.parse(data.minutes.summary)
        summaries.forEach((s, i) => children.push(p(`${i + 1}. ${s}`)))
      } else {
        children.push(p('（暂无摘要）', { italics: true } as any))
      }

      children.push(h('二、会议议题', HeadingLevel.HEADING_1))
      if (data.agendas.length > 0) {
        data.agendas.forEach((a, i) => {
          children.push(p(`${i + 1}. ${a.title}${a.status ? `  【${{ pending: '待讨论', in_progress: '进行中', completed: '已完成' }[a.status] || a.status}】` : ''}`))
        })
      } else {
        children.push(p('（暂无议题）', { italics: true } as any))
      }

      children.push(h('三、待办事项', HeadingLevel.HEADING_1))
      if (data.tasks.length > 0) {
        const priorityMap: any = { low: '低', medium: '中', high: '高' }
        const statusMap: any = { todo: '待处理', in_progress: '进行中', done: '已完成', blocked: '已阻塞' }
        const headerRow = new TableRow({
          children: ['序号', '待办事项', '负责人', '截止日期', '优先级', '状态'].map(t => new TableCell({
            children: [p([run(t, { bold: true, color: '1E293B', size: 20 })], { alignment: AlignmentType.CENTER })],
            shading: headerShading,
            borders: { top: border, bottom: border, left: border, right: border },
            verticalAlign: 'center'
          }))
        })
        const dataRows = data.tasks.map((t, i) => new TableRow({
          children: [
            new TableCell({ children: [p(String(i + 1), { alignment: AlignmentType.CENTER })], borders: { top: border, bottom: border, left: border, right: border } }),
            new TableCell({ children: [p(t.title)], width: { size: 40, type: WidthType.PERCENTAGE }, borders: { top: border, bottom: border, left: border, right: border } }),
            new TableCell({ children: [p(t.assignee || '未分配')], borders: { top: border, bottom: border, left: border, right: border } }),
            new TableCell({ children: [p(t.dueDate ? formatDate(t.dueDate) : '未设置')], borders: { top: border, bottom: border, left: border, right: border } }),
            new TableCell({ children: [p(priorityMap[t.priority] || t.priority)], borders: { top: border, bottom: border, left: border, right: border } }),
            new TableCell({ children: [p(statusMap[t.status] || t.status)], borders: { top: border, bottom: border, left: border, right: border } })
          ]
        }))
        children.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }))
      } else {
        children.push(p('（暂无待办）', { italics: true } as any))
      }

      children.push(h('四、风险点', HeadingLevel.HEADING_1))
      if (data.minutes?.risks) {
        const risks: any[] = JSON.parse(data.minutes.risks)
        const levelMap: any = { low: '低风险', medium: '中风险', high: '高风险' }
        const levelColor: any = { low: '16A34A', medium: 'D97706', high: 'DC2626' }
        risks.forEach((r, i) => {
          children.push(p([
            run(`${i + 1}. `),
            run(`[${levelMap[r.level] || '中风险'}] `, { bold: true, color: levelColor[r.level] || 'D97706' }),
            run(r.content)
          ]))
        })
      } else {
        children.push(p('（暂无风险点）', { italics: true } as any))
      }

      children.push(h('五、会议结论', HeadingLevel.HEADING_1))
      if (data.minutes?.conclusions) {
        const cs: any[] = JSON.parse(data.minutes.conclusions)
        cs.forEach((c, i) => children.push(p(`${i + 1}. ${c.content}`)))
      } else {
        children.push(p('（暂无结论）', { italics: true } as any))
      }

      if (data.minutes?.disputes) {
        const ds: any[] = JSON.parse(data.minutes.disputes)
        if (ds.length > 0) {
          children.push(h('六、争议点', HeadingLevel.HEADING_1))
          ds.forEach((d, i) => children.push(p(`${i + 1}. ${d.content}`)))
        }
      }

      children.push(h('七、附件清单', HeadingLevel.HEADING_1))
      if (data.attachments.length > 0) {
        const headerRow = new TableRow({
          children: ['序号', '文件名', '类型', '大小'].map(t => new TableCell({
            children: [p([run(t, { bold: true, color: '1E293B', size: 20 })], { alignment: AlignmentType.CENTER })],
            shading: headerShading,
            borders: { top: border, bottom: border, left: border, right: border }
          }))
        })
        const catMap: any = { document: '文档', audio: '音频', image: '图片', other: '其他' }
        const dataRows = data.attachments.map((a, i) => new TableRow({
          children: [
            new TableCell({ children: [p(String(i + 1), { alignment: AlignmentType.CENTER })], borders: { top: border, bottom: border, left: border, right: border } }),
            new TableCell({ children: [p(a.fileName)], borders: { top: border, bottom: border, left: border, right: border } }),
            new TableCell({ children: [p(catMap[a.category] || a.category || '其他')], borders: { top: border, bottom: border, left: border, right: border } }),
            new TableCell({ children: [p(formatFileSize(a.fileSize))], borders: { top: border, bottom: border, left: border, right: border } })
          ]
        }))
        children.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }))
      } else {
        children.push(p('（暂无附件）', { italics: true } as any))
      }

      children.push(h('八、聊天记录', HeadingLevel.HEADING_1))
      if (data.chats.length > 0) {
        data.chats.forEach((c: any) => {
          children.push(p([
            run(`[${formatDateTime(c.createdAt)}] `, { color: '64748B', size: 18 }),
            run(`${c.sender}：`, { bold: true, color: '2563EB' }),
            run(c.content)
          ]))
        })
      } else {
        children.push(p('（暂无聊天记录）', { italics: true } as any))
      }

      children.push(h('九、会议截图', HeadingLevel.HEADING_1))
      if (data.screenshots.length > 0) {
        data.screenshots.forEach((s: any, i: number) => {
          children.push(p([
            run(`${i + 1}. ${s.fileName}`),
            s.description ? run(` — ${s.description}`, { color: '64748B', size: 18 }) : run('')
          ]))
        })
      } else {
        children.push(p('（暂无截图）', { italics: true } as any))
      }

      if (data.transcripts.length > 0) {
        children.push(h('十、会议转写原文', HeadingLevel.HEADING_1))
        data.transcripts.forEach((t: any) => {
          children.push(p([
            run(`${t.speaker || '未知'}：`, { bold: true, color: '2563EB' }),
            run(t.content)
          ], { spacing: { after: 60 } }))
        })
      }

      const doc = new Document({
        sections: [{ properties: {}, children }],
        numbering: {
          config: [{
            reference: 'default-bullet-numbering',
            levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }]
          }]
        }
      })
      const buffer = await Packer.toBuffer(doc)

      const safeName = m.title.replace(/[\\/:*?"<>|]/g, '_')
      const saveRes = await window.api.dialog.saveFile({
        defaultPath: `${safeName} - 完整会议资料.docx`,
        filters: [{ name: 'Word 文档', extensions: ['docx'] }]
      })
      if (saveRes.canceled || !saveRes.filePath) { showToast('已取消导出'); return }

      await window.api.file.write(saveRes.filePath, new Uint8Array(buffer))
      await addExportRecord(m, 'Word', saveRes.filePath, buffer.byteLength)
      showToast('Word 文档生成成功！')

      if (confirm('导出成功！是否立即打开文件？')) {
        await window.api.file.open(saveRes.filePath)
      }
    } catch (e: any) {
      console.error(e)
      showToast('导出失败：' + (e.message || e))
    }
  }

  const exportPDF = async () => {
    const m = meetingFilter === 'all' ? meetings[0] : meetings.find(x => x.id === meetingFilter)
    if (!m) { alert('请选择会议'); return }
    showToast(`正在生成《${m.title}》PDF 文档...`)
    try {
      const data = await buildMeetingReport(m)

      const summaries: string[] = data.minutes?.summary ? JSON.parse(data.minutes.summary) : []
      const risks: any[] = data.minutes?.risks ? JSON.parse(data.minutes.risks) : []
      const conclusions: any[] = data.minutes?.conclusions ? JSON.parse(data.minutes.conclusions) : []
      const disputes: any[] = data.minutes?.disputes ? JSON.parse(data.minutes.disputes) : []

      const levelMap: any = { low: { text: '低风险', color: '#16A34A' }, medium: { text: '中风险', color: '#D97706' }, high: { text: '高风险', color: '#DC2626' } }
      const priorityMap: any = { low: '低', medium: '中', high: '高' }
      const statusMap: any = { todo: '待处理', in_progress: '进行中', done: '已完成', blocked: '已阻塞' }
      const catMap: any = { document: '文档', audio: '音频', image: '图片', other: '其他' }
      const agendaStatusMap: any = { pending: '待讨论', in_progress: '进行中', completed: '已完成' }

      const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif; color: #1E293B; line-height: 1.7; padding: 0; margin: 0; font-size: 14px; }
  h1 { font-size: 22px; color: #0F172A; border-bottom: 2px solid #2563EB; padding-bottom: 6px; margin: 28px 0 14px; }
  h2 { font-size: 16px; color: #1E40AF; margin: 20px 0 10px; }
  .title { font-size: 28px; text-align: center; font-weight: 700; color: #0F172A; margin: 10px 0 24px; }
  .meta { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
  .meta p { margin: 4px 0; color: #475569; }
  .meta b { color: #1E293B; margin-right: 4px; }
  ul, ol { margin: 8px 0 8px 22px; padding: 0; }
  li { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 13px; }
  th, td { border: 1px solid #E2E8F0; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #F1F5F9; color: #0F172A; font-weight: 600; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 12px; font-weight: 500; }
  .chat { margin: 6px 0; }
  .chat-meta { color: #64748B; font-size: 12px; }
  .chat-sender { color: #2563EB; font-weight: 600; }
  .empty { color: #94A3B8; font-style: italic; }
  .risk-tag { font-weight: 600; }
</style></head><body>
  <div class="title">${m.title}</div>
  <div class="meta">
    <p><b>会议时间：</b>${formatDateTime(m.startTime)}${m.endTime ? ' ~ ' + formatDateTime(m.endTime) : ''}</p>
    <p><b>会议地点：</b>${m.location || '-'}</p>
    <p><b>参会人员：</b>${data.participants.map(p => `${p.name}${p.isHost ? '（主持人）' : ''}${p.role ? '【' + p.role + '】' : ''}`).join('、') || '-'}</p>
  </div>

  <h1>一、会议摘要</h1>
  ${summaries.length ? `<ol>${summaries.map(s => `<li>${s}</li>`).join('')}</ol>` : '<p class="empty">（暂无摘要）</p>'}

  <h1>二、会议议题</h1>
  ${data.agendas.length ? `<ol>${data.agendas.map(a => `<li>${a.title}${a.status ? ` <span class="badge" style="background:#FEF3C7;color:#92400E">${agendaStatusMap[a.status] || a.status}</span>` : ''}</li>`).join('')}</ol>` : '<p class="empty">（暂无议题）</p>'}

  <h1>三、待办事项</h1>
  ${data.tasks.length ? `
  <table>
    <tr><th style="width:40px">序号</th><th>待办事项</th><th style="width:80px">负责人</th><th style="width:90px">截止日期</th><th style="width:60px">优先级</th><th style="width:70px">状态</th></tr>
    ${data.tasks.map((t, i) => `<tr>
      <td>${i + 1}</td>
      <td>${t.title}</td>
      <td>${t.assignee || '<span class="empty">未分配</span>'}</td>
      <td>${t.dueDate ? formatDate(t.dueDate) : '<span class="empty">未设置</span>'}</td>
      <td>${priorityMap[t.priority] || t.priority}</td>
      <td>${statusMap[t.status] || t.status}</td>
    </tr>`).join('')}
  </table>` : '<p class="empty">（暂无待办）</p>'}

  <h1>四、风险点</h1>
  ${risks.length ? `<ol>${risks.map(r => `<li><span class="risk-tag" style="color:${(levelMap[r.level] || levelMap.medium).color}">[${(levelMap[r.level] || levelMap.medium).text}]</span> ${r.content}</li>`).join('')}</ol>` : '<p class="empty">（暂无风险点）</p>'}

  <h1>五、会议结论</h1>
  ${conclusions.length ? `<ol>${conclusions.map(c => `<li>${c.content}</li>`).join('')}</ol>` : '<p class="empty">（暂无结论）</p>'}

  ${disputes.length ? `<h1>六、争议点</h1><ol>${disputes.map(d => `<li>${d.content}</li>`).join('')}</ol>` : ''}

  <h1>${disputes.length ? '七' : '六'}、附件清单</h1>
  ${data.attachments.length ? `
  <table>
    <tr><th style="width:40px">序号</th><th>文件名</th><th style="width:70px">类型</th><th style="width:80px">大小</th></tr>
    ${data.attachments.map((a, i) => `<tr>
      <td>${i + 1}</td>
      <td>${a.fileName}</td>
      <td>${catMap[a.category] || a.category || '其他'}</td>
      <td>${formatFileSize(a.fileSize)}</td>
    </tr>`).join('')}
  </table>` : '<p class="empty">（暂无附件）</p>'}

  <h1>${disputes.length ? '八' : '七'}、聊天记录</h1>
  ${data.chats.length ? data.chats.map((c: any) => `
  <div class="chat">
    <span class="chat-meta">[${formatDateTime(c.createdAt)}]</span>
    <span class="chat-sender"> ${c.sender}：</span>
    <span>${c.content}</span>
  </div>`).join('') : '<p class="empty">（暂无聊天记录）</p>'}

  <h1>${disputes.length ? '九' : '八'}、会议截图</h1>
  ${data.screenshots.length ? `<ol>${data.screenshots.map((s: any) => `<li>${s.fileName}${s.description ? ` — <span style="color:#64748B">${s.description}</span>` : ''}</li>`).join('')}</ol>` : '<p class="empty">（暂无截图）</p>'}

  ${data.transcripts.length ? `
  <h1>${disputes.length ? '十' : '九'}、会议转写原文</h1>
  ${data.transcripts.map((t: any) => `<div class="chat"><span class="chat-sender">${t.speaker || '未知'}：</span><span>${t.content}</span></div>`).join('')}` : ''}
</body></html>`

      const pdfBuffer = await window.api.pdf.generateFromHtml(html)

      const safeName = m.title.replace(/[\\/:*?"<>|]/g, '_')
      const saveRes = await window.api.dialog.saveFile({
        defaultPath: `${safeName} - 完整会议资料.pdf`,
        filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
      })
      if (saveRes.canceled || !saveRes.filePath) { showToast('已取消导出'); return }

      await window.api.file.write(saveRes.filePath, new Uint8Array(pdfBuffer as any))
      await addExportRecord(m, 'PDF', saveRes.filePath, (pdfBuffer as any)?.length || 0)
      showToast('PDF 文档生成成功！')

      if (confirm('导出成功！是否立即打开文件？')) {
        await window.api.file.open(saveRes.filePath)
      }
    } catch (e: any) {
      console.error(e)
      showToast('导出失败：' + (e.message || e))
    }
  }

  const exportZip = async () => {
    const m = meetingFilter === 'all' ? meetings[0] : meetings.find(x => x.id === meetingFilter)
    if (!m) { alert('请选择会议'); return }
    showToast(`正在打包《${m.title}》完整资料...`)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const safeName = m.title.replace(/[\\/:*?"<>|]/g, '_')
      const folder = zip.folder(`${safeName} - 完整会议资料`)!

      const data = await buildMeetingReport(m)

      showToast('正在生成 Word 和 PDF...')

      // Word
      const {
        Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
        Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, LevelFormat
      } = await import('docx')
      const h = (txt: string, level: any) => new Paragraph({ text: txt, heading: level, spacing: { before: 300, after: 180 } })
      const p = (runs: any[], opts?: any) => new Paragraph({
        children: Array.isArray(runs) ? runs : [new TextRun(runs as any)], spacing: { after: 80 }, ...opts
      })
      const run = (txt: string, opts?: any) => new TextRun({ text: txt, ...opts })
      const border = { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' }
      const headerShading = { type: ShadingType.CLEAR, fill: 'F1F5F9', color: 'auto' }

      const wChildren: any[] = []
      wChildren.push(new Paragraph({ text: m.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 500 } }))
      wChildren.push(p([run('会议时间：', { bold: true }), run(`${formatDateTime(m.startTime)}${m.endTime ? ' ~ ' + formatDateTime(m.endTime) : ''}`)]))
      wChildren.push(p([run('会议地点：', { bold: true }), run(m.location || '-')]))
      wChildren.push(p([run('参会人员：', { bold: true }), run(data.participants.map(p => `${p.name}${p.isHost ? '（主持人）' : ''}${p.role ? `【${p.role}】` : ''}`).join('、') || '-')], { spacing: { after: 400 } }))
      wChildren.push(h('一、会议摘要', HeadingLevel.HEADING_1))
      if (data.minutes?.summary) {
        JSON.parse(data.minutes.summary).forEach((s: string, i: number) => wChildren.push(p(`${i + 1}. ${s}`)))
      } else wChildren.push(p('（暂无摘要）', { italics: true } as any))
      wChildren.push(h('二、会议议题', HeadingLevel.HEADING_1))
      if (data.agendas.length) data.agendas.forEach((a: any, i: number) => wChildren.push(p(`${i + 1}. ${a.title}`)))
      else wChildren.push(p('（暂无议题）', { italics: true } as any))
      const doc = new Document({ sections: [{ properties: {}, children: wChildren }] })
      const wordBuffer = await Packer.toBuffer(doc)
      folder.file(`${safeName} - 会议纪要.docx`, new Uint8Array(wordBuffer))

      // PDF
      const pdfHtml = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>
        body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",Arial,sans-serif;color:#1E293B;line-height:1.7;font-size:14px}
        h1{font-size:22px;border-bottom:2px solid #2563EB;padding-bottom:6px;margin:28px 0 14px;color:#0F172A}
        .title{font-size:28px;text-align:center;font-weight:700;margin:10px 0 24px}
        .meta{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:12px 16px}
        .meta p{margin:4px 0;color:#475569}.meta b{color:#1E293B}
      </style></head><body>
        <div class="title">${m.title}</div>
        <div class="meta">
          <p><b>会议时间：</b>${formatDateTime(m.startTime)}${m.endTime ? ' ~ ' + formatDateTime(m.endTime) : ''}</p>
          <p><b>会议地点：</b>${m.location || '-'}</p>
          <p><b>参会人员：</b>${data.participants.map(p => `${p.name}${p.isHost ? '（主持人）' : ''}`).join('、') || '-'}</p>
        </div>
        <h1>会议摘要</h1>
        ${data.minutes?.summary ? `<ol>${JSON.parse(data.minutes.summary).map((s: string) => `<li>${s}</li>`).join('')}</ol>` : '<p>（暂无）</p>'}
      </body></html>`
      const pdfBuffer = await window.api.pdf.generateFromHtml(pdfHtml)
      folder.file(`${safeName} - 会议纪要.pdf`, new Uint8Array(pdfBuffer as any))

      // 聊天记录文本
      if (data.chats.length) {
        const chatText = data.chats.map((c: any) =>
          `[${formatDateTime(c.createdAt)}] ${c.sender}：${c.content}`
        ).join('\n')
        folder.file('聊天记录.txt', `${m.title}\n导出时间：${formatDateTime(new Date().toISOString())}\n\n${chatText}`)
      }

      // 目录说明
      const levelMap: any = { low: '低风险', medium: '中风险', high: '高风险' }
      const catMap: any = { document: '文档', audio: '音频', image: '图片', other: '其他' }
      const readme = `【${m.title}】完整会议资料包\n` +
        `导出时间：${formatDateTime(new Date().toISOString())}\n\n` +
        `目录说明：\n` +
        `  1. ${safeName} - 会议纪要.docx   ——  完整 Word 版会议纪要\n` +
        `  2. ${safeName} - 会议纪要.pdf    ——  完整 PDF 版会议纪要\n` +
        `  3. 附件/                          ——  原始附件文件（${data.attachments.length} 个）\n` +
        `  4. 截图/                          ——  会议截图原文件（${data.screenshots.length} 个）\n` +
        (data.chats.length ? `  5. 聊天记录.txt                    ——  完整聊天记录文本\n` : '') +
        `\n会议信息：\n` +
        `  · 时间：${formatDateTime(m.startTime)}${m.endTime ? ' ~ ' + formatDateTime(m.endTime) : ''}\n` +
        `  · 地点：${m.location || '-'}\n` +
        `  · 参会人数：${data.participants.length} 人\n` +
        `  · 议题目录：\n${data.agendas.map((a: any, i: number) => `      ${i + 1}. ${a.title}`).join('\n') || '      （无）'}\n` +
        `  · 待办事项：${data.tasks.length} 项\n` +
        `  · 风险点：${data.minutes?.risks ? JSON.parse(data.minutes.risks).length : 0} 个\n` +
        `  · 附件：${data.attachments.length} 个\n` +
        `  · 截图：${data.screenshots.length} 个\n` +
        (data.minutes?.risks ? `\n风险提示：\n${JSON.parse(data.minutes.risks).map((r: any, i: number) => `  ${i + 1}. [${levelMap[r.level] || '中风险'}] ${r.content}`).join('\n')}` : '') +
        `\n\n—— 由 AI 会议助理自动生成`
      folder.file('00-目录说明.txt', readme)

      // 附件
      if (data.attachments.length) {
        const attFolder = folder.folder('附件')!
        for (const a of data.attachments) {
          try {
            if (a.filePath) {
              const fs = await import('fs/promises')
              try {
                const buf = await fs.readFile(a.filePath)
                attFolder.file(a.fileName, buf)
              } catch { attFolder.file(`${a.fileName}.txt`, `（原始文件无法读取：${a.filePath}）`) }
            } else {
              attFolder.file(`${a.fileName}.txt`, `（文件路径缺失）`)
            }
          } catch {
            attFolder.file(`${a.fileName}.txt`, `附件：${a.fileName}（${catMap[a.category] || '其他'}，${formatFileSize(a.fileSize)}）`)
          }
        }
      }

      // 截图
      if (data.screenshots.length) {
        const shotFolder = folder.folder('截图')!
        for (const s of data.screenshots) {
          try {
            if (s.filePath) {
              const fs = await import('fs/promises')
              try {
                const buf = await fs.readFile(s.filePath)
                shotFolder.file(s.fileName, buf)
              } catch { shotFolder.file(`${s.fileName}.txt`, `（原始截图无法读取：${s.filePath}）`) }
            } else {
              shotFolder.file(`${s.fileName}.txt`, `截图：${s.fileName}${s.description ? ` — ${s.description}` : ''}`)
            }
          } catch {
            shotFolder.file(`${s.fileName}.txt`, `截图：${s.fileName}${s.description ? ` — ${s.description}` : ''}`)
          }
        }
      }

      showToast('正在生成压缩包...')
      const zipBuffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } })

      const saveRes = await window.api.dialog.saveFile({
        defaultPath: `${safeName} - 完整会议资料.zip`,
        filters: [{ name: '压缩包', extensions: ['zip'] }]
      })
      if (saveRes.canceled || !saveRes.filePath) { showToast('已取消导出'); return }

      await window.api.file.write(saveRes.filePath, zipBuffer)
      await addExportRecord(m, '压缩包', saveRes.filePath, zipBuffer.length)
      showToast('完整资料包导出成功！')

      if (confirm('导出成功！是否立即打开所在文件夹？')) {
        await window.api.file.showInFolder(saveRes.filePath)
      }
    } catch (e: any) {
      console.error(e)
      showToast('打包失败：' + (e.message || e))
    }
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

  const confirmLock = async () => {
    if (!lockFormPwd.trim()) {
      alert('请设置密码')
      return
    }
    await enableLock(lockFormPwd.trim())
    setShowLockModal(false)
    setLockFormPwd('')
    showToast('已启用本地权限锁定')
  }
  const unlock = () => {
    if (unlockResources(pwdInput)) {
      setPwdInput('')
      showToast('已解锁')
    } else {
      alert('密码不正确')
    }
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
    { key: 'search' as const, label: '全文搜索', icon: Search, count: null },
    { key: 'history' as const, label: '导出记录', icon: Clock, count: exportRecords.length }
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
              <button onClick={() => { exportZip(); setShowExportMenu(false) }} className="w-full text-left px-3 py-2 hover:bg-slate-50 inline-flex items-center gap-2">
                <Package size={14} className="text-amber-600" /> 打包完整资料（ZIP）
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button onClick={() => { generateEmail(); setShowExportMenu(false) }} className="w-full text-left px-3 py-2 hover:bg-slate-50 inline-flex items-center gap-2">
                <Mail size={14} className="text-primary-600" /> 生成邮件正文
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => { setLockFormPwd(''); setShowLockModal(true) }}
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
        ) : tab === 'history' ? (
          <div className="h-full overflow-y-auto scrollbar-thin p-6">
            {exportRecords.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="暂无导出记录"
                desc="导出会议资料后，记录会显示在这里"
              />
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="text-xs text-slate-500 mb-4 flex items-center justify-between">
                  <span>共 {exportRecords.length} 条导出记录</span>
                  <button
                    onClick={loadExportRecords}
                    className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                  >
                    <Clock size={12} /> 刷新
                  </button>
                </div>
                <div className="space-y-2">
                  {exportRecords.map(rec => {
                    const fmtColor: Record<string, string> = {
                      'Word': 'bg-blue-100 text-blue-700',
                      'PDF': 'bg-red-100 text-red-700',
                      '压缩包': 'bg-amber-100 text-amber-700'
                    }
                    return (
                      <div
                        key={rec.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm transition flex items-center gap-4"
                      >
                        <div className={cn(
                          'w-11 h-11 rounded-lg flex items-center justify-center shrink-0',
                          rec.format === 'Word' ? 'bg-blue-50' : rec.format === 'PDF' ? 'bg-red-50' : 'bg-amber-50'
                        )}>
                          {rec.format === 'Word' ? <FileWord size={20} className="text-blue-600" /> :
                            rec.format === 'PDF' ? <FileSpreadsheet size={20} className="text-red-600" /> :
                              <Package size={20} className="text-amber-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-slate-800 truncate">{rec.meetingTitle}</span>
                            <span className={cn('tag', fmtColor[rec.format] || 'bg-slate-100 text-slate-600')}>{rec.format}</span>
                          </div>
                          <div className="text-xs text-slate-500 truncate flex items-center gap-2">
                            <span>{rec.filePath}</span>
                            {rec.fileSize ? <span>· {formatFileSize(rec.fileSize)}</span> : null}
                            <span>· {formatDateTime(rec.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={async () => {
                              try { await window.api.file.open(rec.filePath) }
                              catch { alert('文件不存在或无法打开') }
                            }}
                            className="btn-ghost !p-2"
                            title="打开文件"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => window.api.file.showInFolder(rec.filePath)}
                            className="btn-ghost !p-2"
                            title="打开所在文件夹"
                          >
                            <FolderOpen size={15} />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('确定删除此导出记录？（不会删除实际文件）')) return
                              await window.api.exportRecords.delete(rec.id)
                              await loadExportRecords()
                            }}
                            className="btn-ghost !p-2 hover:!text-red-600 hover:!bg-red-50"
                            title="删除记录"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
              value={lockFormPwd}
              onChange={e => setLockFormPwd(e.target.value)}
              placeholder={lockPassword ? '输入新密码（留空则取消锁定）' : '设置访问密码'}
              className="input mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {lockPassword && (
                <button
                  onClick={async () => {
                    await disableLock()
                    setShowLockModal(false)
                    showToast('已取消锁定')
                  }}
                  className="btn-danger"
                >
                  <Unlock size={14} /> 取消锁定
                </button>
              )}
              <button onClick={() => setShowLockModal(false)} className="btn-secondary">取消</button>
              <button onClick={confirmLock} className="btn-primary">
                {lockPassword ? '修改密码' : '启用锁定'}
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
