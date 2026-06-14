import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type {
  Meeting, Task, Attachment, TranscriptSegment, AgendaItem,
  MeetingMinutes, Participant, ChatMessage, Screenshot
} from '../src/types'

let db: Database.Database

export function initDatabase() {
  const userDataDir = process.env.APPDATA ||
    (process.platform === 'darwin'
      ? process.env.HOME + '/Library/Application Support'
      : process.env.HOME + '/.local/share')
  const dbDir = path.join(userDataDir, 'ai-meeting-assistant')

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, 'meeting-assistant.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  insertSeedData()
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      meetingType TEXT CHECK(meetingType IN ('online','offline','hybrid')) DEFAULT 'offline',
      status TEXT CHECK(status IN ('scheduled','in_progress','completed','cancelled')) DEFAULT 'scheduled',
      startTime TEXT NOT NULL,
      endTime TEXT,
      duration INTEGER,
      audioPath TEXT,
      password TEXT,
      isLocked INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      updatedAt TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetingId INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      avatar TEXT,
      isHost INTEGER DEFAULT 0,
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetingId INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      assignee TEXT,
      status TEXT CHECK(status IN ('todo','in_progress','review','done')) DEFAULT 'todo',
      priority TEXT CHECK(priority IN ('low','medium','high','urgent')) DEFAULT 'medium',
      dueDate TEXT,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      updatedAt TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetingId INTEGER,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      fileSize INTEGER,
      fileType TEXT,
      category TEXT CHECK(category IN ('document','audio','image','other')) DEFAULT 'other',
      content TEXT,
      tags TEXT,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetingId INTEGER NOT NULL,
      speaker TEXT,
      speakerColor TEXT,
      content TEXT NOT NULL,
      startTime REAL,
      endTime REAL,
      keywords TEXT,
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetingId INTEGER NOT NULL,
      title TEXT NOT NULL,
      orderIndex INTEGER DEFAULT 0,
      duration INTEGER,
      status TEXT CHECK(status IN ('pending','in_progress','completed')) DEFAULT 'pending',
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS minutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetingId INTEGER NOT NULL UNIQUE,
      summary TEXT,
      todos TEXT,
      risks TEXT,
      conclusions TEXT,
      disputes TEXT,
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetingId INTEGER NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetingId INTEGER NOT NULL,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      description TEXT,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );
  `)
}

function insertSeedData() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM meetings').get() as { cnt: number }
  if (count.cnt > 0) return

  const insertMeeting = db.prepare(`
    INSERT INTO meetings (title, description, location, meetingType, status, startTime, endTime, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertParticipant = db.prepare(`
    INSERT INTO participants (meetingId, name, role, email, isHost)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertTask = db.prepare(`
    INSERT INTO tasks (meetingId, title, description, assignee, status, priority, dueDate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertAgenda = db.prepare(`
    INSERT INTO agendas (meetingId, title, orderIndex, duration, status)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertTranscript = db.prepare(`
    INSERT INTO transcripts (meetingId, speaker, speakerColor, content, startTime, endTime, keywords)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMinutes = db.prepare(`
    INSERT INTO minutes (meetingId, summary, todos, risks, conclusions, disputes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const now = new Date()
  const isoDate = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')

  const meetings = [
    {
      title: 'Q2 产品规划评审会',
      description: '评审第二季度产品路线图，确定优先级和资源分配',
      location: '3号会议室 / 腾讯会议',
      meetingType: 'hybrid',
      status: 'completed' as const,
      startTime: isoDate(new Date(now.getTime() - 2 * 86400000)),
      endTime: isoDate(new Date(now.getTime() - 2 * 86400000 + 2 * 3600000)),
      duration: 120
    },
    {
      title: '前端性能优化专项',
      description: '讨论首屏加载慢、交互卡顿等性能问题解决方案',
      location: '线上 - 飞书会议',
      meetingType: 'online' as const,
      status: 'in_progress' as const,
      startTime: isoDate(new Date(now.getTime() - 1 * 3600000)),
      endTime: null,
      duration: null
    },
    {
      title: '客户需求沟通会',
      description: '与重要客户沟通定制化需求',
      location: '客户办公区',
      meetingType: 'offline' as const,
      status: 'scheduled' as const,
      startTime: isoDate(new Date(now.getTime() + 2 * 86400000)),
      endTime: isoDate(new Date(now.getTime() + 2 * 86400000 + 90 * 60000)),
      duration: 90
    },
    {
      title: '技术债务清理计划',
      description: '盘点现有技术债务，制定清理排期',
      location: '1号会议室',
      meetingType: 'offline' as const,
      status: 'scheduled' as const,
      startTime: isoDate(new Date(now.getTime() + 4 * 86400000)),
      endTime: isoDate(new Date(now.getTime() + 4 * 86400000 + 60 * 60000)),
      duration: 60
    }
  ]

  const participantNames = [
    { name: '张明', role: '项目经理', email: 'zhangming@company.com' },
    { name: '李华', role: '产品总监', email: 'lihua@company.com' },
    { name: '王芳', role: '技术负责人', email: 'wangfang@company.com' },
    { name: '陈伟', role: '前端工程师', email: 'chenwei@company.com' },
    { name: '刘洋', role: '后端工程师', email: 'liuyang@company.com' },
    { name: '赵敏', role: '测试工程师', email: 'zhaomin@company.com' },
    { name: '孙丽', role: 'UI 设计师', email: 'sunli@company.com' }
  ]

  const tx = db.transaction(() => {
    meetings.forEach((m, mIdx) => {
      const result = insertMeeting.run(m.title, m.description, m.location, m.meetingType, m.status, m.startTime, m.endTime, m.duration)
      const meetingId = result.lastInsertRowid as number

      const pCount = 3 + Math.floor(Math.random() * 3)
      for (let i = 0; i < pCount; i++) {
        const p = participantNames[(mIdx * 2 + i) % participantNames.length]
        insertParticipant.run(meetingId, p.name, p.role, p.email, i === 0 ? 1 : 0)
      }

      insertAgenda.run(meetingId, '议题一：会议开场与背景介绍', 1, 10, 'completed')
      insertAgenda.run(meetingId, '议题二：核心问题讨论与分析', 2, 40, mIdx === 1 ? 'in_progress' : 'completed')
      insertAgenda.run(meetingId, '议题三：方案评审与决策', 3, 45, mIdx < 2 ? 'completed' : 'pending')
      insertAgenda.run(meetingId, '议题四：任务分配与总结', 4, 25, mIdx < 2 ? 'completed' : 'pending')

      if (mIdx < 2) {
        const speakers = ['张明', '李华', '王芳', '陈伟']
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
        const sentences = [
          '大家好，我们今天来讨论 Q2 的产品规划。',
          '先看一下市场部那边给的最新数据。',
          '关于性能这块，我觉得我们需要做一个专项优化。',
          '同意，首屏加载时间确实影响了用户留存。',
          '我建议先从代码分割和图片懒加载开始入手。',
          '还有接口响应速度，后端那边是不是可以做缓存？',
          '可以，Redis 方案我们上周已经在评估了。',
          '那就这么定，先出一个详细的技术方案。'
        ]
        sentences.forEach((s, sIdx) => {
          insertTranscript.run(
            meetingId,
            speakers[sIdx % speakers.length],
            colors[sIdx % colors.length],
            s,
            sIdx * 30,
            sIdx * 30 + 25,
            JSON.stringify([])
          )
        })

        insertMinutes.run(
          meetingId,
          JSON.stringify([
            '确定了 Q2 的产品优先级，核心围绕用户增长和体验优化展开。',
            '性能问题是本季度最高优先级，需要成立专项小组跟进。'
          ]),
          JSON.stringify([
            { content: '输出性能优化技术方案', assignee: '王芳' },
            { content: '准备下周客户沟通材料', assignee: '李华' }
          ]),
          JSON.stringify([
            '第三方支付接口稳定性存在风险，需要提前做容灾预案。',
            '人员变动可能影响项目进度，需提前储备备份资源。'
          ]),
          JSON.stringify([
            '性能优化优先于新功能开发。',
            '每周五下午召开进度同步例会。'
          ]),
          JSON.stringify([
            '关于首页改版方案，设计部和产品部存在分歧，需要会后进一步讨论。'
          ])
        )

        const taskTitles = [
          '输出性能优化技术方案',
          '编写需求文档初稿',
          '完成接口联调测试',
          '设计稿评审与反馈'
        ]
        const assignees = ['王芳', '李华', '刘洋', '孙丽']
        const statuses = ['done', 'in_progress', 'todo', 'review'] as const
        const priorities = ['high', 'medium', 'medium', 'low'] as const
        for (let t = 0; t < 4; t++) {
          insertTask.run(
            meetingId,
            taskTitles[t],
            `${taskTitles[t]}的详细描述，请按时完成并同步进度。`,
            assignees[t],
            statuses[t],
            priorities[t],
            isoDate(new Date(now.getTime() + (t + 1) * 86400000))
          )
        }
      }
    })
  })
  tx()
}

export const databaseHandlers = {
  'meetings:create': (data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>) => {
    const stmt = db.prepare(`
      INSERT INTO meetings (title, description, location, meetingType, status, startTime, endTime, duration, audioPath, password, isLocked)
      VALUES (@title, @description, @location, @meetingType, @status, @startTime, @endTime, @duration, @audioPath, @password, @isLocked)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM meetings WHERE id = ?').get(result.lastInsertRowid)
  },
  'meetings:getAll': () => {
    return db.prepare('SELECT * FROM meetings ORDER BY startTime DESC').all()
  },
  'meetings:getById': (id: number) => {
    return db.prepare('SELECT * FROM meetings WHERE id = ?').get(id)
  },
  'meetings:update': (id: number, data: Partial<Meeting>) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    const stmt = db.prepare(`UPDATE meetings SET ${fields}, updatedAt = datetime('now','localtime') WHERE id = @id`)
    stmt.run({ ...data, id })
    return db.prepare('SELECT * FROM meetings WHERE id = ?').get(id)
  },
  'meetings:delete': (id: number) => {
    db.prepare('DELETE FROM meetings WHERE id = ?').run(id)
    return { success: true }
  },
  'meetings:getByDateRange': (start: string, end: string) => {
    return db.prepare('SELECT * FROM meetings WHERE startTime >= ? AND startTime <= ? ORDER BY startTime').all(start, end)
  },

  'participants:create': (data: Omit<Participant, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO participants (meetingId, name, role, email, avatar, isHost)
      VALUES (@meetingId, @name, @role, @email, @avatar, @isHost)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM participants WHERE id = ?').get(result.lastInsertRowid)
  },
  'participants:getByMeeting': (meetingId: number) => {
    return db.prepare('SELECT * FROM participants WHERE meetingId = ? ORDER BY isHost DESC, id').all(meetingId)
  },
  'participants:update': (id: number, data: Partial<Participant>) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE participants SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db.prepare('SELECT * FROM participants WHERE id = ?').get(id)
  },
  'participants:delete': (id: number) => {
    db.prepare('DELETE FROM participants WHERE id = ?').run(id)
    return { success: true }
  },
  'participants:getAll': () => {
    return db.prepare('SELECT DISTINCT name, role, email FROM participants ORDER BY name').all()
  },

  'tasks:create': (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const stmt = db.prepare(`
      INSERT INTO tasks (meetingId, title, description, assignee, status, priority, dueDate)
      VALUES (@meetingId, @title, @description, @assignee, @status, @priority, @dueDate)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  },
  'tasks:getAll': () => {
    return db.prepare('SELECT * FROM tasks ORDER BY updatedAt DESC').all()
  },
  'tasks:getByMeeting': (meetingId: number) => {
    return db.prepare('SELECT * FROM tasks WHERE meetingId = ? ORDER BY id').all(meetingId)
  },
  'tasks:getByAssignee': (assignee: string) => {
    return db.prepare('SELECT * FROM tasks WHERE assignee = ? ORDER BY dueDate').all(assignee)
  },
  'tasks:update': (id: number, data: Partial<Task>) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    const stmt = db.prepare(`UPDATE tasks SET ${fields}, updatedAt = datetime('now','localtime') WHERE id = @id`)
    stmt.run({ ...data, id })
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  },
  'tasks:delete': (id: number) => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return { success: true }
  },

  'attachments:create': (data: Omit<Attachment, 'id' | 'createdAt'>) => {
    const stmt = db.prepare(`
      INSERT INTO attachments (meetingId, fileName, filePath, fileSize, fileType, category, content, tags)
      VALUES (@meetingId, @fileName, @filePath, @fileSize, @fileType, @category, @content, @tags)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid)
  },
  'attachments:getByMeeting': (meetingId: number) => {
    return db.prepare('SELECT * FROM attachments WHERE meetingId = ? ORDER BY createdAt DESC').all(meetingId)
  },
  'attachments:search': (keyword: string) => {
    const like = `%${keyword}%`
    return db.prepare(`
      SELECT * FROM attachments
      WHERE fileName LIKE ? OR content LIKE ? OR tags LIKE ?
      ORDER BY createdAt DESC
    `).all(like, like, like)
  },
  'attachments:update': (id: number, data: Partial<Attachment>) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE attachments SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id)
  },
  'attachments:delete': (id: number) => {
    db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
    return { success: true }
  },

  'transcripts:create': (data: Omit<TranscriptSegment, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO transcripts (meetingId, speaker, speakerColor, content, startTime, endTime, keywords)
      VALUES (@meetingId, @speaker, @speakerColor, @content, @startTime, @endTime, @keywords)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM transcripts WHERE id = ?').get(result.lastInsertRowid)
  },
  'transcripts:createBatch': (segments: Omit<TranscriptSegment, 'id'>[]) => {
    const stmt = db.prepare(`
      INSERT INTO transcripts (meetingId, speaker, speakerColor, content, startTime, endTime, keywords)
      VALUES (@meetingId, @speaker, @speakerColor, @content, @startTime, @endTime, @keywords)
    `)
    const tx = db.transaction(segs => {
      for (const s of segs) stmt.run(s)
    })
    tx(segments)
    return { success: true, count: segments.length }
  },
  'transcripts:getByMeeting': (meetingId: number) => {
    return db.prepare('SELECT * FROM transcripts WHERE meetingId = ? ORDER BY startTime').all(meetingId)
  },
  'transcripts:update': (id: number, data: Partial<TranscriptSegment>) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE transcripts SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db.prepare('SELECT * FROM transcripts WHERE id = ?').get(id)
  },
  'transcripts:deleteByMeeting': (meetingId: number) => {
    db.prepare('DELETE FROM transcripts WHERE meetingId = ?').run(meetingId)
    return { success: true }
  },

  'agendas:create': (data: Omit<AgendaItem, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO agendas (meetingId, title, orderIndex, duration, status)
      VALUES (@meetingId, @title, @orderIndex, @duration, @status)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM agendas WHERE id = ?').get(result.lastInsertRowid)
  },
  'agendas:getByMeeting': (meetingId: number) => {
    return db.prepare('SELECT * FROM agendas WHERE meetingId = ? ORDER BY orderIndex').all(meetingId)
  },
  'agendas:update': (id: number, data: Partial<AgendaItem>) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE agendas SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db.prepare('SELECT * FROM agendas WHERE id = ?').get(id)
  },
  'agendas:delete': (id: number) => {
    db.prepare('DELETE FROM agendas WHERE id = ?').run(id)
    return { success: true }
  },

  'minutes:create': (data: Omit<MeetingMinutes, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO minutes (meetingId, summary, todos, risks, conclusions, disputes)
      VALUES (@meetingId, @summary, @todos, @risks, @conclusions, @disputes)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM minutes WHERE id = ?').get(result.lastInsertRowid)
  },
  'minutes:getByMeeting': (meetingId: number) => {
    return db.prepare('SELECT * FROM minutes WHERE meetingId = ?').get(meetingId)
  },
  'minutes:update': (id: number, data: Partial<MeetingMinutes>) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE minutes SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db.prepare('SELECT * FROM minutes WHERE id = ?').get(id)
  },

  'chatMessages:create': (data: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    const stmt = db.prepare(`
      INSERT INTO chat_messages (meetingId, sender, content)
      VALUES (@meetingId, @sender, @content)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid)
  },
  'chatMessages:getByMeeting': (meetingId: number) => {
    return db.prepare('SELECT * FROM chat_messages WHERE meetingId = ? ORDER BY createdAt').all(meetingId)
  },
  'chatMessages:delete': (id: number) => {
    db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id)
    return { success: true }
  },

  'screenshots:create': (data: Omit<Screenshot, 'id' | 'createdAt'>) => {
    const stmt = db.prepare(`
      INSERT INTO screenshots (meetingId, fileName, filePath, description)
      VALUES (@meetingId, @fileName, @filePath, @description)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM screenshots WHERE id = ?').get(result.lastInsertRowid)
  },
  'screenshots:getByMeeting': (meetingId: number) => {
    return db.prepare('SELECT * FROM screenshots WHERE meetingId = ? ORDER BY createdAt DESC').all(meetingId)
  },
  'screenshots:delete': (id: number) => {
    db.prepare('DELETE FROM screenshots WHERE id = ?').run(id)
    return { success: true }
  },

  'search:fullText': (keyword: string) => {
    const like = `%${keyword}%`
    return {
      meetings: db.prepare(`
        SELECT 'meeting' as type, id, title as name, description as detail FROM meetings
        WHERE title LIKE ? OR description LIKE ?
      `).all(like, like),
      tasks: db.prepare(`
        SELECT 'task' as type, id, title as name, description as detail FROM tasks
        WHERE title LIKE ? OR description LIKE ?
      `).all(like, like),
      attachments: db.prepare(`
        SELECT 'attachment' as type, id, fileName as name, content as detail FROM attachments
        WHERE fileName LIKE ? OR content LIKE ?
      `).all(like, like),
      transcripts: db.prepare(`
        SELECT 'transcript' as type, t.id, t.speaker as name, t.content as detail,
               m.id as meetingId, m.title as meetingTitle
        FROM transcripts t JOIN meetings m ON t.meetingId = m.id
        WHERE t.content LIKE ?
      `).all(like)
    }
  }
}
