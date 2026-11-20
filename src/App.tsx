import { useCallback, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { GraphCanvas } from './components/GraphCanvas'
import { dirColor, graphStats, hubNodes, orphanNodes } from './graph'
import { buildGraph, normalizePath, parseFilesFromText, serializeFiles } from './parser'
import { sampleFiles } from './sampleProject'
import type { GraphModel, SourceFile } from './types'

const initialText = serializeFiles(sampleFiles)
const initialModel = buildGraph(sampleFiles)

export default function App() {
  const [text, setText] = useState(initialText)
  const [files, setFiles] = useState<SourceFile[]>(sampleFiles)
  const [model, setModel] = useState<GraphModel>(initialModel)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [colorMode, setColorMode] = useState<'dir' | 'kind'>('dir')
  const [resetToken, setResetToken] = useState(0)
  const [parsing, setParsing] = useState(false)
  const [notice, setNotice] = useState('已加载内置示例项目 · 11 个文件')
  const uploadRef = useRef<HTMLInputElement>(null)

  const applyFiles = useCallback((nextFiles: SourceFile[], nextText: string, label: string): void => {
    setParsing(true)
    window.setTimeout(() => {
      const nextModel = buildGraph(nextFiles)
      setFiles(nextFiles)
      setModel(nextModel)
      setText(nextText)
      setSelected(null)
      setSearch('')
      setParsing(false)
      setNotice(`${label} · ${nextModel.nodes.length} 个文件 / ${nextModel.edges.length} 条依赖`)
    }, 140)
  }, [])

  const handleTextParse = (): void => {
    const parsed = parseFilesFromText(text)
    applyFiles(parsed, text, '解析完成')
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selectedFiles.length === 0) return
    const loaded = await Promise.all(
      selectedFiles.map(async (file) => ({
        path: (file.webkitRelativePath || file.name).replace(/^\/+/, ''),
        content: await file.text(),
      })),
    )
    applyFiles(loaded, serializeFiles(loaded), `已导入 ${loaded.length} 个文件`)
  }

  const stats = graphStats(model)
  const orphans = orphanNodes(model.nodes)
  const hubs = hubNodes(model.nodes)

  const focusIds = useMemo(() => {
    let base: Set<string> | null = null
    if (selected) {
      base = new Set([selected])
      for (const edge of model.edges) {
        if (edge.source === selected) base.add(edge.target)
        if (edge.target === selected) base.add(edge.source)
      }
    }
    const query = search.trim().toLowerCase()
    if (query) {
      const matches = new Set(
        model.nodes
          .filter((node) => node.path.toLowerCase().includes(query))
          .map((node) => node.id),
      )
      return base ? new Set([...base].filter((id) => matches.has(id))) : matches
    }
    return base
  }, [selected, search, model])

  const selectNode = useCallback((id: string | null): void => {
    setSelected((current) => (current === id ? null : id))
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="5" r="3" />
              <circle cx="6" cy="24" r="3" />
              <circle cx="26" cy="24" r="3" />
              <path d="M16 8 L8 21 M16 8 L24 21 M9 24 L23 24" />
            </svg>
          </div>
          <div>
            <h1>CodeGraph</h1>
            <p>看见代码之间的隐形连线</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-heading">
            <span className="panel-index">01</span>
            <h2>源代码输入</h2>
          </div>
          <textarea
            className="code-input"
            spellCheck={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={'// @file src/index.ts\nexport const hello = 1\n\n// @file src/app.ts\nimport { hello } from "./index"'}
          />
          <p className="field-hint">多文件请使用 <code>// @file 路径</code> 分隔</p>
          <div className="button-row">
            <button type="button" className="btn btn-primary" onClick={handleTextParse} disabled={parsing}>
              解析代码
            </button>
            <button type="button" className="btn" onClick={() => uploadRef.current?.click()} disabled={parsing}>
              上传文件
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => applyFiles(sampleFiles, initialText, '已加载内置示例项目')}
              disabled={parsing}
            >
              加载示例项目
            </button>
          </div>
          <input
            ref={uploadRef}
            type="file"
            multiple
            accept=".ts,.tsx,.js,.jsx,.mjs,.cjs"
            className="visually-hidden"
            onChange={handleUpload}
          />
          <p className="notice" role="status">{notice}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <span className="panel-index">02</span>
            <h2>文件列表</h2>
            <span className="count-chip">{files.length}</span>
          </div>
          <div className="file-list">
            {files.map((file, index) => {
              const node = model.nodes.find((item) => item.path === normalizePath(file.path))
              const degree = node?.degree ?? 0
              return (
                <button
                  type="button"
                  key={`${file.path}-${index}`}
                  className={`file-row${selected === node?.id ? ' is-active' : ''}`}
                  onClick={() => node && selectNode(node.id)}
                >
                  <i className="file-dot" style={{ background: dirColor(node?.dir ?? '.') }} />
                  <span className="file-path">{file.path}</span>
                  <span className="file-degree">{degree}</span>
                </button>
              )
            })}
          </div>
          {model.parseErrors.length > 0 && (
            <p className="warning-text">⚠ {model.parseErrors.length} 个文件解析异常，已降级为空节点</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <span className="panel-index">03</span>
            <h2>依赖分析</h2>
          </div>
          <div className="stat-grid">
            <div className="stat-card"><strong>{stats.files}</strong><span>文件数</span></div>
            <div className="stat-card"><strong>{stats.edges}</strong><span>依赖边</span></div>
            <div className="stat-card stat-card-warn"><strong>{stats.cycles}</strong><span>循环依赖</span></div>
            <div className="stat-card"><strong>{stats.avgDegree}</strong><span>平均度数</span></div>
          </div>

          <div className="analysis-block">
            <h3><i className="block-dot block-dot-warn" />循环依赖 <span>{model.cycles.length}</span></h3>
            {model.cycles.length === 0 ? (
              <p className="empty-hint">未发现循环依赖，结构很健康 ✓</p>
            ) : (
              <ul className="cycle-list">
                {model.cycles.map((cycle) => (
                  <li key={cycle.join('>')}>
                    <button type="button" onClick={() => selectNode(cycle[0])}>
                      {[...cycle, cycle[0]].map((id) => id.split('/').pop()).join(' → ')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="analysis-block">
            <h3><i className="block-dot block-dot-muted" />孤儿节点 <span>{orphans.length}</span></h3>
            {orphans.length === 0 ? (
              <p className="empty-hint">没有孤立文件</p>
            ) : (
              <ul className="plain-list">
                {orphans.map((node) => (
                  <li key={node.id}>
                    <button type="button" onClick={() => selectNode(node.id)}>{node.path}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="analysis-block">
            <h3><i className="block-dot block-dot-accent" />枢纽节点 <span>Top 5</span></h3>
            <ul className="hub-list">
              {hubs.map((node) => (
                <li key={node.id}>
                  <button type="button" onClick={() => selectNode(node.id)}>
                    <span className="hub-name">{node.label}</span>
                    <span className="hub-bar">
                      <i style={{ width: `${(node.degree / Math.max(hubs[0]?.degree ?? 1, 1)) * 100}%` }} />
                    </span>
                    <span className="hub-value">{node.degree}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="sidebar-footer">AST 解析 · 力导向布局 · 全本地运行</footer>
      </aside>

      <main className="canvas-panel">
        <header className="canvas-header">
          <div className="canvas-title">
            <span className="live-dot" />
            <div>
              <h2>依赖图谱</h2>
              <p>{selected ? `聚焦：${selected}` : '点击任意节点查看它的邻居'}</p>
            </div>
          </div>
          <div className="canvas-controls">
            <label className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索文件名…"
              />
            </label>
            <div className="segmented" role="group" aria-label="着色方式">
              <button
                type="button"
                className={colorMode === 'dir' ? 'is-active' : ''}
                onClick={() => setColorMode('dir')}
              >
                按目录
              </button>
              <button
                type="button"
                className={colorMode === 'kind' ? 'is-active' : ''}
                onClick={() => setColorMode('kind')}
              >
                按类型
              </button>
            </div>
            <button
              type="button"
              className="btn btn-relayout"
              onClick={() => setResetToken((value) => value + 1)}
            >
              ↻ 重新布局
            </button>
            {selected && (
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                清除聚焦
              </button>
            )}
          </div>
        </header>

        <div className="canvas-stage">
          <GraphCanvas
            model={model}
            focusIds={focusIds}
            colorMode={colorMode}
            resetToken={resetToken}
            onSelect={selectNode}
          />
          {parsing && (
            <div className="canvas-loading">
              <div className="spinner" />
              <span>正在解析 AST…</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
