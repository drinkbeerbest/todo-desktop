export type Task = {
  id: string; title: string; notes: string; dueDate: string | null; dueTime: string;
  starred: boolean; completed: boolean; createdAt: string; completedAt: string | null;
}
export type Note = { id: string; title: string; body: string; updatedAt: string }
export type Settings = { theme: 'light' | 'dark' | 'system'; confetti: boolean; reduceMotion: boolean; compact: boolean; notifications: boolean }
export type AppData = { version: number; tasks: Task[]; notes: Note[]; settings: Settings }
export type View = 'today' | 'all' | 'upcoming' | 'completed' | 'notes'
export type Sort = 'manual' | 'date' | 'created'

declare global {
  interface Window {
    desktop?: {
      load: () => Promise<{ data: AppData | null; warning?: string }>
      save: (data: AppData) => Promise<void>
      exportData: (data: AppData) => Promise<boolean>
      importData: () => Promise<AppData | null>
      minimize: () => void
      maximize: () => void
      close: () => void
      onMaximize: (callback: (value: boolean) => void) => () => void
      onTask: (callback: (id: string) => void) => () => void
    }
  }
}
