import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext, type AppState } from './appContext'
import { TopNav } from './components/TopNav'
import { GraphPage } from './pages/GraphPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { FilesPage } from './pages/FilesPage'
import { CyclesPage } from './pages/CyclesPage'
import { OrphansPage } from './pages/OrphansPage'
import { InputPage } from './pages/InputPage'
import { MetricsPage } from './pages/MetricsPage'
import { GuidePage } from './pages/GuidePage'
import { AboutPage } from './pages/AboutPage'
import { SettingsPage } from './pages/SettingsPage'
import { buildGraph, serializeFiles } from './parser'
import { sampleFiles } from './sampleProject'
import { loadJSON, saveJSON, STORAGE_KEYS } from './storage'
import { useHashRoute } from './useHashRoute'
import type { GraphModel, GraphSettings, HistoryEntry, SavedProject, SourceFile } from './types'

const initialText = serializeFiles(sampleFiles)
const initialModel = buildGraph(sampleFiles)
const DEFAULT_SETTINGS: GraphSettings = { nodeScale: 1, showLabels: true, repulsion: 14000 }

function isEntryArray(value: unknown): boolean {
  return Array.isArray(value)
}

function isSettings(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<GraphSettings>
  return typeof candidate.nodeScale === 'number'
    && typeof candidate.showLabels === 'boolean'
    && typeof candidate.repulsion === 'number'
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export default function App() {
  const [route, navigate] = useHashRoute()
  const [text, setText] = useState(initialText)
  const [files, setFiles] = useState<SourceFile[]>(sampleFiles)
  const [model, setModel] = useState<GraphModel>(initialModel)
  const [selected, setSelectedState] = useState<string | null>(null)
  const [highlightIds, setHighlightIds] = useState<Set<string> | null>(null)
  const [colorMode, setColorMode] = useState<'dir' | 'kind'>('dir')
  const [resetToken, setResetToken] = useState(0)
  const [parsing, setParsing] = useState(false)
  const [notice, setNotice] = useState('已加载内置示例项目 · 11 个文件')
  const [settings, setSettings] = useState<GraphSettings>(() => loadJSON(STORAGE_KEYS.settings, DEFAULT_SETTINGS, isSettings))
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadJSON(STORAGE_KEYS.history, [], isEntryArray))
  const [projects, setProjects] = useState<SavedProject[]>(() => loadJSON(STORAGE_KEYS.projects, [], isEntryArray))
  const viewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    viewRef.current?.scrollTo({ top: 0 })
    window.scrollTo(0, 0)
  }, [route])

  const setSelected = useCallback((id: string | null): void => {
    setSelectedState((current) => (current === id ? null : id))
    setHighlightIds(null)
  }, [])

  // 从其它页面跳转到图谱，并让目标文件或整条环处于高亮状态
  const openInGraph = useCallback((ids: string[]): void => {
    const known = new Set(model.nodes.map((node) => node.id))
    const valid = ids.filter((id) => known.has(id))
    setSelectedState(valid.length === 1 ? valid[0] : null)
    setHighlightIds(valid.length > 1 ? new Set(valid) : null)
    navigate('graph')
  }, [model.nodes, navigate])

  const applyFiles = useCallback((nextFiles: SourceFile[], nextText: string, label: string, recordHistory = true): void => {
    setParsing(true)
    window.setTimeout(() => {
      const nextModel = buildGraph(nextFiles)
      setFiles(nextFiles)
      setModel(nextModel)
      setText(nextText)
      setSelectedState(null)
      setHighlightIds(null)
      setParsing(false)
      setNotice(`${label} · ${nextModel.nodes.length} 个文件 / ${nextModel.edges.length} 条依赖`)
      if (!recordHistory || !nextText.trim()) return
      const entry: HistoryEntry = {
        id: makeId(),
        label,
        at: Date.now(),
        files: nextModel.nodes.length,
        edges: nextModel.edges.length,
        text: nextText,
      }
      setHistory((prev) => saveJSON(STORAGE_KEYS.history, [entry, ...prev].slice(0, 12)))
    }, 140)
  }, [])

  const updateSettings = useCallback((patch: Partial<GraphSettings>): void => {
    setSettings((prev) => saveJSON(STORAGE_KEYS.settings, { ...prev, ...patch }))
  }, [])

  const removeHistory = useCallback((id: string): void => {
    setHistory((prev) => saveJSON(STORAGE_KEYS.history, prev.filter((entry) => entry.id !== id)))
  }, [])

  const saveProject = useCallback((name: string): void => {
    const trimmed = name.trim() || `未命名项目 ${new Date().toLocaleDateString('zh-CN')}`
    const entry: SavedProject = {
      id: makeId(),
      name: trimmed,
      at: Date.now(),
      files: model.nodes.length,
      edges: model.edges.length,
      cycles: model.cycles.length,
      text,
    }
    setProjects((prev) => saveJSON(STORAGE_KEYS.projects, [entry, ...prev].slice(0, 20)))
    setNotice(`已保存项目「${trimmed}」到本地项目库`)
  }, [model, text])

  const removeProject = useCallback((id: string): void => {
    setProjects((prev) => saveJSON(STORAGE_KEYS.projects, prev.filter((project) => project.id !== id)))
  }, [])

  const value = useMemo<AppState>(() => ({
    route,
    navigate,
    text,
    setText,
    files,
    model,
    parsing,
    notice,
    selected,
    setSelected,
    highlightIds,
    openInGraph,
    applyFiles,
    settings,
    updateSettings,
    history,
    removeHistory,
    projects,
    saveProject,
    removeProject,
  }), [
    route, navigate, text, files, model, parsing, notice, selected, setSelected,
    highlightIds, openInGraph, applyFiles, settings, updateSettings, history,
    removeHistory, projects, saveProject, removeProject,
  ])

  return (
    <AppContext.Provider value={value}>
      <div className="app-root">
        <TopNav />
        <div ref={viewRef} className={`page-view${route === 'graph' ? ' is-graph' : ''}`}>
          {route === 'graph' && (
            <GraphPage
              colorMode={colorMode}
              setColorMode={setColorMode}
              resetToken={resetToken}
              onRelayout={() => setResetToken((current) => current + 1)}
            />
          )}
          {route === 'projects' && <ProjectsPage />}
          {route === 'files' && <FilesPage />}
          {route === 'cycles' && <CyclesPage />}
          {route === 'orphans' && <OrphansPage />}
          {route === 'input' && <InputPage />}
          {route === 'metrics' && <MetricsPage />}
          {route === 'guide' && <GuidePage />}
          {route === 'about' && <AboutPage />}
          {route === 'settings' && <SettingsPage />}
        </div>
      </div>
    </AppContext.Provider>
  )
}
