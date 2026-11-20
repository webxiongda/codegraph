import { useMemo, useState } from 'react'
import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'
import { dirColor, kindColor } from '../graph'
import type { GraphNode } from '../types'

interface TreeEntry {
  name: string
  path: string
  children: Map<string, TreeEntry>
  file?: GraphNode
}

function countFiles(entry: TreeEntry): number {
  return (entry.file ? 1 : 0) + [...entry.children.values()].reduce((total, child) => total + countFiles(child), 0)
}

interface RowProps {
  node: GraphNode
  depth?: number
  onOpen: (id: string) => void
}

function FileRow({ node, depth = 0, onOpen }: RowProps) {
  return (
    <button
      type="button"
      className="file-table-row"
      style={{ paddingLeft: `${14 + depth * 18}px` }}
      onClick={() => onOpen(node.id)}
      title={`在图谱中聚焦 ${node.path}`}
    >
      <i className="file-dot" style={{ background: dirColor(node.dir) }} />
      <span className="file-table-name">{node.label}</span>
      <span className="file-kind" style={{ color: kindColor(node.kind) }}>{node.kind.toUpperCase()}</span>
      <span className="file-table-path">{node.dir}</span>
      <span className="num-cell">{node.inDegree}</span>
      <span className="num-cell">{node.outDegree}</span>
      <span className="num-cell is-strong">{node.degree}</span>
    </button>
  )
}

interface BranchProps {
  entry: TreeEntry
  depth: number
  collapsed: Set<string>
  onToggle: (path: string) => void
  onOpen: (id: string) => void
}

function TreeBranch({ entry, depth, collapsed, onToggle, onOpen }: BranchProps) {
  if (entry.file && entry.children.size === 0) {
    return <FileRow node={entry.file} depth={depth} onOpen={onOpen} />
  }
  const isOpen = !collapsed.has(entry.path)
  return (
    <div className="tree-branch">
      <button type="button" className="folder-row" style={{ paddingLeft: `${14 + depth * 18}px` }} onClick={() => onToggle(entry.path)}>
        <span className="folder-arrow">{isOpen ? '▾' : '▸'}</span>
        <span className="folder-icon">{isOpen ? '▤' : '▦'}</span>
        <strong>{entry.name}</strong>
        <span className="folder-count">{countFiles(entry)} 个文件</span>
      </button>
      {isOpen && [...entry.children.values()].map((child) => (
        <TreeBranch key={child.path} entry={child} depth={depth + 1} collapsed={collapsed} onToggle={onToggle} onOpen={onOpen} />
      ))}
      {entry.file && isOpen && <FileRow node={entry.file} depth={depth + 1} onOpen={onOpen} />}
    </div>
  )
}

export function FilesPage() {
  const { model, openInGraph } = useApp()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const nodes = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? model.nodes.filter((node) => node.path.toLowerCase().includes(needle)) : model.nodes
  }, [model.nodes, query])

  const tree = useMemo(() => {
    const root: TreeEntry = { name: '', path: '', children: new Map() }
    for (const node of nodes) {
      const parts = node.path.split('/')
      let cursor = root
      parts.forEach((part, index) => {
        const path = parts.slice(0, index + 1).join('/')
        let child = cursor.children.get(part)
        if (!child) {
          child = { name: part, path, children: new Map() }
          cursor.children.set(part, child)
        }
        cursor = child
      })
      cursor.file = node
    }
    return root
  }, [nodes])

  const toggle = (path: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const openFile = (id: string): void => openInGraph([id])

  const totalIn = model.nodes.reduce((sum, node) => sum + node.inDegree, 0)
  const totalOut = model.nodes.reduce((sum, node) => sum + node.outDegree, 0)

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="FILE EXPLORER"
        title="文件浏览器"
        description="按目录树或平铺列表查看当前项目的每个文件；点击任意文件即回到图谱并聚焦它的邻居。"
        actions={
          <div className="segmented">
            <button type="button" className={view === 'tree' ? 'is-active' : ''} onClick={() => setView('tree')}>树形</button>
            <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')}>列表</button>
          </div>
        }
      />

      <div className="metric-strip">
        <span><strong>{model.nodes.length}</strong> 个文件</span>
        <span><strong>{totalIn}</strong> 条入边</span>
        <span><strong>{totalOut}</strong> 条出边</span>
        <span><strong>{new Set(model.nodes.map((node) => node.dir)).size}</strong> 个目录</span>
      </div>

      <div className="panel-card file-browser">
        <div className="browser-toolbar">
          <label className="search-box wide">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="按路径筛选文件…" />
          </label>
          <div className="table-head-hint">入度 / 出度 / 总度数</div>
        </div>

        <div className="file-table-head">
          <span>文件 / 目录</span><span>类型</span><span>所在目录</span><span>入</span><span>出</span><span>度</span>
        </div>

        {nodes.length === 0 ? (
          <div className="empty-state">没有匹配的文件，换个关键词试试。</div>
        ) : view === 'tree' ? (
          <div className="file-tree">
            {[...tree.children.values()].map((child) => (
              <TreeBranch key={child.path} entry={child} depth={0} collapsed={collapsed} onToggle={toggle} onOpen={openFile} />
            ))}
          </div>
        ) : (
          <div className="file-table">
            {nodes.map((node) => <FileRow key={node.id} node={node} onOpen={openFile} />)}
          </div>
        )}
      </div>
    </div>
  )
}
