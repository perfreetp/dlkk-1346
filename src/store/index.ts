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
}

export const useAppStore = create<AppState>((set) => ({
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
  setParticipants: (p) => set({ participants: p })
}))
