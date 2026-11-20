import { createContext, useContext } from 'react'
import type { GraphModel, GraphSettings, HistoryEntry, SavedProject, SourceFile } from './types'
import type { RouteId } from './routes'

export interface AppState {
  route: RouteId
  navigate: (route: RouteId) => void
  text: string
  setText: (value: string) => void
  files: SourceFile[]
  model: GraphModel
  parsing: boolean
  notice: string
  selected: string | null
  setSelected: (id: string | null) => void
  highlightIds: Set<string> | null
  openInGraph: (ids: string[]) => void
  applyFiles: (files: SourceFile[], text: string, label: string, recordHistory?: boolean) => void
  settings: GraphSettings
  updateSettings: (patch: Partial<GraphSettings>) => void
  history: HistoryEntry[]
  removeHistory: (id: string) => void
  projects: SavedProject[]
  saveProject: (name: string) => void
  removeProject: (id: string) => void
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp 必须在 AppContext.Provider 内使用')
  return value
}
