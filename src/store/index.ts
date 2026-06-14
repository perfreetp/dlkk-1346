import { create } from 'zustand'
import type { Meeting, Task, Participant } from '@/types'

interface AppState {
  currentMeetingId: number | null
  setCurrentMeetingId: (id: number | null) => void

  meetings: Meeting[]
  setMeetings: (meetings: Meeting[]) => void
  addMeeting: (meeting: Meeting) => void
  updateMeeting: (meeting: Meeting) => void
  removeMeeting: (id: number) => void

  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  removeTask: (id: number) => void

  participants: Participant[]
  setParticipants: (p: Participant[]) => void
  addParticipant: (p: Participant) => void
  removeParticipant: (id: number) => void
  updateParticipant: (p: Participant) => void

  isResourcesLocked: boolean
  lockPassword: string | null
  setResourcesLocked: (locked: boolean) => void
  setLockPassword: (pwd: string | null) => void
  initLockState: () => Promise<void>
  enableLock: (password: string) => Promise<void>
  disableLock: () => Promise<void>
  unlockResources: (password: string) => boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  currentMeetingId: null,
  setCurrentMeetingId: (id) => set({ currentMeetingId: id }),

  meetings: [],
  setMeetings: (meetings) => set({ meetings }),
  addMeeting: (meeting) => set((s) => ({ meetings: [meeting, ...s.meetings] })),
  updateMeeting: (meeting) => set((s) => ({
    meetings: s.meetings.map(m => m.id === meeting.id ? meeting : m)
  })),
  removeMeeting: (id) => set((s) => ({
    meetings: s.meetings.filter(m => m.id !== id)
  })),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (task) => set((s) => ({
    tasks: s.tasks.map(t => t.id === task.id ? task : t)
  })),
  removeTask: (id) => set((s) => ({
    tasks: s.tasks.filter(t => t.id !== id)
  })),

  participants: [],
  setParticipants: (p) => set({ participants: p }),
  addParticipant: (p) => set((s) => ({ participants: [...s.participants, p] })),
  removeParticipant: (id) => set((s) => ({
    participants: s.participants.filter(p => p.id !== id)
  })),
  updateParticipant: (p) => set((s) => ({
    participants: s.participants.map(x => x.id === p.id ? p : x)
  })),

  isResourcesLocked: false,
  lockPassword: null,
  setResourcesLocked: (locked) => set({ isResourcesLocked: locked }),
  setLockPassword: (pwd) => set({ lockPassword: pwd }),

  initLockState: async () => {
    try {
      const pwd = await window.api.settings.get('resourcesLockPassword')
      if (pwd) {
        set({ lockPassword: pwd, isResourcesLocked: true })
      }
    } catch (e) {
      console.warn('Init lock state failed:', e)
    }
  },

  enableLock: async (password: string) => {
    await window.api.settings.set('resourcesLockPassword', password)
    set({ lockPassword: password, isResourcesLocked: true })
  },

  disableLock: async () => {
    await window.api.settings.set('resourcesLockPassword', '')
    set({ lockPassword: null, isResourcesLocked: false })
  },

  unlockResources: (password: string) => {
    const { lockPassword } = get()
    if (password === lockPassword) {
      set({ isResourcesLocked: false })
      return true
    }
    return false
  }
}))
