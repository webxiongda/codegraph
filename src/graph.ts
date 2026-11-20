import type { DependencyEdge, FileKind, GraphModel, GraphNode } from './types'

/** 用 DFS 三色标记找出所有有向环，同一环的不同起点只保留一份 */
export function findCycles(ids: string[], edges: DependencyEdge[]): string[][] {
  const adjacency = new Map<string, string[]>()
  for (const id of ids) adjacency.set(id, [])
  for (const edge of edges) {
    const list = adjacency.get(edge.source)
    if (list) list.push(edge.target)
  }

  const color = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Map<string, number>()
  const seen = new Set<string>()
  const cycles: string[][] = []

  const visit = (id: string): void => {
    color.set(id, 1)
    onStack.set(id, stack.length)
    stack.push(id)

    for (const next of adjacency.get(id) ?? []) {
      const state = color.get(next) ?? 0
      if (state === 0) {
        visit(next)
      } else if (state === 1 && onStack.has(next)) {
        const from = onStack.get(next) ?? 0
        const raw = stack.slice(from)
        let min = 0
        for (let i = 1; i < raw.length; i++) if (raw[i] < raw[min]) min = i
        const rotated = [...raw.slice(min), ...raw.slice(0, min)]
        const key = rotated.join('\u0000')
        if (!seen.has(key)) {
          seen.add(key)
          cycles.push(rotated)
        }
      }
    }

    stack.pop()
    onStack.delete(id)
    color.set(id, 2)
  }

  for (const id of ids) if ((color.get(id) ?? 0) === 0) visit(id)
  return cycles.sort((a, b) => a.length - b.length || a.join('/').localeCompare(b.join('/')))
}

export function graphStats(model: GraphModel) {
  const files = model.nodes.length
  const edges = model.edges.length
  return {
    files,
    edges,
    cycles: model.cycles.length,
    avgDegree: files ? Number(((2 * edges) / files).toFixed(2)) : 0,
  }
}

export function orphanNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter((node) => node.degree === 0)
}

export function hubNodes(nodes: GraphNode[], count = 5): GraphNode[] {
  return [...nodes].sort((a, b) => b.degree - a.degree).slice(0, count)
}

export const ACCENTS = [
  '#22d3ee', '#a78bfa', '#f472b6', '#34d399',
  '#fbbf24', '#60a5fa', '#fb7185', '#c084fc',
]

export function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return Math.abs(hash)
}

export function dirColor(dir: string): string {
  return ACCENTS[hashString(dir) % ACCENTS.length]
}

export function kindColor(kind: FileKind): string {
  switch (kind) {
    case 'tsx': return '#f472b6'
    case 'jsx': return '#fbbf24'
    case 'ts': return '#22d3ee'
    case 'js': return '#a78bfa'
    default: return '#64748b'
  }
}
