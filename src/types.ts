export type FileKind = 'ts' | 'tsx' | 'js' | 'jsx' | 'other'

export interface SourceFile {
  path: string
  content: string
}

export type EdgeKind = 'import' | 'dynamic' | 'export' | 'type' | 'require'

export interface DependencyEdge {
  id: string
  source: string
  target: string
  specifier: string
  kind: EdgeKind
  isCycle: boolean
}

export interface GraphNode {
  id: string
  path: string
  label: string
  dir: string
  kind: FileKind
  inDegree: number
  outDegree: number
  degree: number
}

export interface ParseError {
  path: string
  message: string
}

export interface GraphModel {
  nodes: GraphNode[]
  edges: DependencyEdge[]
  cycles: string[][]
  parseErrors: ParseError[]
}

export interface GraphSettings {
  nodeScale: number
  showLabels: boolean
  repulsion: number
}

export interface HistoryEntry {
  id: string
  label: string
  at: number
  files: number
  edges: number
  text: string
}

export interface SavedProject {
  id: string
  name: string
  at: number
  files: number
  edges: number
  cycles: number
  text: string
}
