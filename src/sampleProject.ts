import type { SourceFile } from './types'

// 内置示例：一个刻意包含循环依赖与孤儿文件的迷你前端项目，打开即可看到完整图谱
export const sampleFiles: SourceFile[] = [
  {
    path: 'src/main.tsx',
    content: `import { createRoot } from 'react-dom/client'
import { App } from './App'
import type { GraphNode } from './types'

const seed: GraphNode[] = []
const container = document.getElementById('root')

if (container) {
  createRoot(container).render(<App nodes={seed} />)
}
`,
  },
  {
    path: 'src/App.tsx',
    content: `import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { GraphCanvas } from './components/GraphCanvas'
import { useForceLayout } from './hooks/useForceLayout'
import type { GraphNode } from './types'

export const APP_TITLE = 'CodeGraph'

export function App(props: { nodes: GraphNode[] }) {
  const layout = useForceLayout(props.nodes, [])
  return (
    <main className="app">
      <Sidebar nodes={layout} />
      <Toolbar node={props.nodes[0]} />
      <GraphCanvas nodes={layout} edges={[]} />
    </main>
  )
}
`,
  },
  {
    path: 'src/components/Sidebar.tsx',
    content: `import type { GraphNode } from '../types'
import { Toolbar } from './Toolbar'
import { useGraphData } from '../hooks/useGraphData'
import { degreeOf } from '../utils/graph'

export function Sidebar(props: { nodes: GraphNode[] }) {
  const extra = useGraphData('')
  const total = props.nodes.length + extra.length + degreeOf([])
  return (
    <aside className="sidebar">
      <span>{total}</span>
      <Toolbar node={props.nodes[0]} />
    </aside>
  )
}
`,
  },
  {
    path: 'src/components/Toolbar.tsx',
    content: `import { APP_TITLE } from '../App'
import { Sidebar } from './Sidebar'
import type { GraphNode } from '../types'

export function Toolbar(props: { node: GraphNode }) {
  const label = props.node ? props.node.label : APP_TITLE
  return <div className="toolbar">{label + Sidebar.name}</div>
}
`,
  },
  {
    path: 'src/components/GraphCanvas.tsx',
    content: `import type { GraphEdge, GraphNode } from '../types'
import { useForceLayout } from '../hooks/useForceLayout'
import { degreeOf } from '../utils/graph'

export function GraphCanvas(props: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const layout = useForceLayout(props.nodes, props.edges)
  const count = layout.length + degreeOf(props.edges)
  return <svg data-node-count={count} />
}
`,
  },
  {
    path: 'src/hooks/useForceLayout.ts',
    content: `import type { GraphEdge, GraphNode } from '../types'
import { degreeOf } from '../utils/graph'

export function useForceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const weight = degreeOf(edges)
  return nodes.map((node) => ({ ...node, weight: node.degree + weight }))
}
`,
  },
  {
    path: 'src/hooks/useGraphData.ts',
    content: `import type { GraphNode } from '../types'
import { parseImports } from '../utils/parser'
import { normalizePath } from '../utils/graph'

export type { GraphNode } from '../types'

export function useGraphData(source: string): GraphNode[] {
  return parseImports(source).map((spec, index) => ({
    id: normalizePath(spec),
    label: spec,
    degree: index,
  }))
}
`,
  },
  {
    path: 'src/utils/parser.ts',
    content: `import type { GraphEdge } from '../types'
import { normalizePath } from './graph'

export function parseImports(source: string): string[] {
  const result: string[] = []
  const pattern = /from\\s+['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) {
    result.push(normalizePath(match[1]))
  }
  return result
}

export function toEdges(imports: string[]): GraphEdge[] {
  return imports.map((spec) => ({ source: spec, target: spec }))
}
`,
  },
  {
    path: 'src/utils/graph.ts',
    content: `import type { GraphEdge } from '../types'
import { parseImports } from './parser'

export function normalizePath(input: string): string {
  return input.replace(/\\\\/g, '/').trim()
}

export function degreeOf(edges: GraphEdge[]): number {
  return edges.length + parseImports('').length
}
`,
  },
  {
    path: 'src/types.ts',
    content: `export interface GraphNode {
  id: string
  label: string
  degree: number
}

export interface GraphEdge {
  source: string
  target: string
}

export type LayoutMode = 'force' | 'radial'
`,
  },
  {
    path: 'src/styles/theme.ts',
    content: `export const theme = {
  accent: '#22d3ee',
  surface: '#0f172a',
  radius: 14,
}
`,
  },
]
