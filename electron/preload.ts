import { contextBridge, ipcRenderer } from 'electron'
import type {
  Meeting, Task, Attachment, TranscriptSegment, AgendaItem,
  MeetingMinutes, Participant, ChatMessage, Screenshot
} from '../src/types'

const api = {
  meetings: {
    create: (data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke('meetings:create', data),
    getAll: () => ipcRenderer.invoke('meetings:getAll'),
    getById: (id: number) => ipcRenderer.invoke('meetings:getById', id),
    update: (id: number, data: Partial<Meeting>) =>
      ipcRenderer.invoke('meetings:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('meetings:delete', id),
    getByDateRange: (start: string, end: string) =>
      ipcRenderer.invoke('meetings:getByDateRange', start, end)
  },
  participants: {
    create: (data: Omit<Participant, 'id'>) =>
      ipcRenderer.invoke('participants:create', data),
    getByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('participants:getByMeeting', meetingId),
    update: (id: number, data: Partial<Participant>) =>
      ipcRenderer.invoke('participants:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('participants:delete', id),
    getAll: () => ipcRenderer.invoke('participants:getAll')
  },
  tasks: {
    create: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke('tasks:create', data),
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('tasks:getByMeeting', meetingId),
    getByAssignee: (assignee: string) =>
      ipcRenderer.invoke('tasks:getByAssignee', assignee),
    update: (id: number, data: Partial<Task>) =>
      ipcRenderer.invoke('tasks:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tasks:delete', id)
  },
  attachments: {
    create: (data: Omit<Attachment, 'id' | 'createdAt'>) =>
      ipcRenderer.invoke('attachments:create', data),
    getByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('attachments:getByMeeting', meetingId),
    search: (keyword: string) =>
      ipcRenderer.invoke('attachments:search', keyword),
    update: (id: number, data: Partial<Attachment>) =>
      ipcRenderer.invoke('attachments:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('attachments:delete', id)
  },
  transcripts: {
    create: (data: Omit<TranscriptSegment, 'id'>) =>
      ipcRenderer.invoke('transcripts:create', data),
    createBatch: (segments: Omit<TranscriptSegment, 'id'>[]) =>
      ipcRenderer.invoke('transcripts:createBatch', segments),
    getByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('transcripts:getByMeeting', meetingId),
    update: (id: number, data: Partial<TranscriptSegment>) =>
      ipcRenderer.invoke('transcripts:update', id, data),
    deleteByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('transcripts:deleteByMeeting', meetingId)
  },
  agendas: {
    create: (data: Omit<AgendaItem, 'id'>) =>
      ipcRenderer.invoke('agendas:create', data),
    getByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('agendas:getByMeeting', meetingId),
    update: (id: number, data: Partial<AgendaItem>) =>
      ipcRenderer.invoke('agendas:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('agendas:delete', id)
  },
  minutes: {
    create: (data: Omit<MeetingMinutes, 'id'>) =>
      ipcRenderer.invoke('minutes:create', data),
    getByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('minutes:getByMeeting', meetingId),
    update: (id: number, data: Partial<MeetingMinutes>) =>
      ipcRenderer.invoke('minutes:update', id, data)
  },
  chatMessages: {
    create: (data: Omit<ChatMessage, 'id' | 'createdAt'>) =>
      ipcRenderer.invoke('chatMessages:create', data),
    getByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('chatMessages:getByMeeting', meetingId),
    delete: (id: number) => ipcRenderer.invoke('chatMessages:delete', id)
  },
  screenshots: {
    create: (data: Omit<Screenshot, 'id' | 'createdAt'>) =>
      ipcRenderer.invoke('screenshots:create', data),
    getByMeeting: (meetingId: number) =>
      ipcRenderer.invoke('screenshots:getByMeeting', meetingId),
    delete: (id: number) => ipcRenderer.invoke('screenshots:delete', id)
  },
  fullSearch: (keyword: string) => ipcRenderer.invoke('search:fullText', keyword),
  dialog: {
    openFile: (filters?: Electron.FileFilter[]) =>
      ipcRenderer.invoke('dialog:openFile', filters),
    saveFile: (options?: { defaultPath?: string; filters?: Electron.FileFilter[] }) =>
      ipcRenderer.invoke('dialog:saveFile', options)
  },
  app: {
    getPath: (name: any) => ipcRenderer.invoke('app:getPath', name)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
