export type MeetingType = 'online' | 'offline' | 'hybrid'
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Meeting {
  id: number
  title: string
  description?: string
  location?: string
  meetingType: MeetingType
  status: MeetingStatus
  startTime: string
  endTime?: string
  duration?: number
  audioPath?: string
  password?: string
  isLocked: number
  createdAt: string
  updatedAt: string
}

export interface Participant {
  id: number
  meetingId: number
  name: string
  role?: string
  email?: string
  avatar?: string
  isHost: number
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: number
  meetingId?: number
  title: string
  description?: string
  assignee?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export type AttachmentCategory = 'document' | 'audio' | 'image' | 'other'

export interface Attachment {
  id: number
  meetingId?: number
  fileName: string
  filePath: string
  fileSize?: number
  fileType?: string
  category: AttachmentCategory
  content?: string
  tags?: string
  createdAt: string
}

export interface TranscriptSegment {
  id: number
  meetingId: number
  speaker?: string
  speakerColor?: string
  content: string
  startTime?: number
  endTime?: number
  keywords?: string
}

export type AgendaStatus = 'pending' | 'in_progress' | 'completed'

export interface AgendaItem {
  id: number
  meetingId: number
  title: string
  orderIndex: number
  duration?: number
  status: AgendaStatus
}

export interface MeetingMinutes {
  id: number
  meetingId: number
  summary?: string
  todos?: string
  risks?: string
  conclusions?: string
  disputes?: string
}

export interface ChatMessage {
  id: number
  meetingId: number
  sender: string
  content: string
  createdAt: string
}

export interface Screenshot {
  id: number
  meetingId: number
  fileName: string
  filePath: string
  description?: string
  createdAt: string
}

export interface SearchResult {
  type: 'meeting' | 'task' | 'attachment' | 'transcript'
  id: number
  name: string
  detail?: string
  meetingId?: number
  meetingTitle?: string
}

declare global {
  interface Window {
    api: {
      meetings: {
        create: (data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Meeting>
        getAll: () => Promise<Meeting[]>
        getById: (id: number) => Promise<Meeting>
        update: (id: number, data: Partial<Meeting>) => Promise<Meeting>
        delete: (id: number) => Promise<{ success: boolean }>
        getByDateRange: (start: string, end: string) => Promise<Meeting[]>
      }
      participants: {
        create: (data: Omit<Participant, 'id'>) => Promise<Participant>
        getByMeeting: (meetingId: number) => Promise<Participant[]>
        update: (id: number, data: Partial<Participant>) => Promise<Participant>
        delete: (id: number) => Promise<{ success: boolean }>
        getAll: () => Promise<Participant[]>
      }
      tasks: {
        create: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>
        getAll: () => Promise<Task[]>
        getByMeeting: (meetingId: number) => Promise<Task[]>
        getByAssignee: (assignee: string) => Promise<Task[]>
        update: (id: number, data: Partial<Task>) => Promise<Task>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      attachments: {
        create: (data: Omit<Attachment, 'id' | 'createdAt'>) => Promise<Attachment>
        getByMeeting: (meetingId: number) => Promise<Attachment[]>
        search: (keyword: string) => Promise<Attachment[]>
        update: (id: number, data: Partial<Attachment>) => Promise<Attachment>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      transcripts: {
        create: (data: Omit<TranscriptSegment, 'id'>) => Promise<TranscriptSegment>
        createBatch: (segments: Omit<TranscriptSegment, 'id'>[]) => Promise<{ success: boolean; count: number }>
        getByMeeting: (meetingId: number) => Promise<TranscriptSegment[]>
        update: (id: number, data: Partial<TranscriptSegment>) => Promise<TranscriptSegment>
        deleteByMeeting: (meetingId: number) => Promise<{ success: boolean }>
      }
      agendas: {
        create: (data: Omit<AgendaItem, 'id'>) => Promise<AgendaItem>
        getByMeeting: (meetingId: number) => Promise<AgendaItem[]>
        update: (id: number, data: Partial<AgendaItem>) => Promise<AgendaItem>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      minutes: {
        create: (data: Omit<MeetingMinutes, 'id'>) => Promise<MeetingMinutes>
        getByMeeting: (meetingId: number) => Promise<MeetingMinutes>
        update: (id: number, data: Partial<MeetingMinutes>) => Promise<MeetingMinutes>
      }
      chatMessages: {
        create: (data: Omit<ChatMessage, 'id' | 'createdAt'>) => Promise<ChatMessage>
        getByMeeting: (meetingId: number) => Promise<ChatMessage[]>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      screenshots: {
        create: (data: Omit<Screenshot, 'id' | 'createdAt'>) => Promise<Screenshot>
        getByMeeting: (meetingId: number) => Promise<Screenshot[]>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      fullSearch: (keyword: string) => Promise<{
        meetings: SearchResult[]
        tasks: SearchResult[]
        attachments: SearchResult[]
        transcripts: SearchResult[]
      }>
      dialog: {
        openFile: (filters?: any[]) => Promise<{ canceled: boolean; filePaths: string[] }>
        saveFile: (options?: { defaultPath?: string; filters?: any[] }) => Promise<{ canceled: boolean; filePath?: string }>
      }
      app: {
        getPath: (name: string) => Promise<string>
      }
      file: {
        write: (filePath: string, data: string | Uint8Array, encoding?: string) => Promise<{ success: boolean }>
        open: (filePath: string) => Promise<{ success: boolean; error?: string }>
        showInFolder: (filePath: string) => Promise<{ success: boolean }>
      }
      pdf: {
        generateFromHtml: (html: string) => Promise<Uint8Array>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<{ success: boolean }>
        getAll: () => Promise<Record<string, string>>
      }
      agendaMinutes: {
        getByAgenda: (meetingId: number, agendaId: number) => Promise<any>
        save: (meetingId: number, agendaId: number, data: any) => Promise<any>
        deleteByAgenda: (meetingId: number, agendaId: number) => Promise<{ success: boolean }>
      }
      exportRecords: {
        list: (limit?: number, filter?: any) => Promise<any[]>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<any>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      participantTemplates: {
        list: () => Promise<any[]>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<any>
        delete: (id: number) => Promise<{ success: boolean }>
      }
    }
  }
}

export {}
