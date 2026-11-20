import { useState } from 'react'
import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'
import { formatTime } from '../format'
import { buildGraph, parseFilesFromText, serializeFiles } from '../parser'
import { projectPresets } from '../sampleProject'

export function ProjectsPage() {
  const { projects, saveProject, removeProject, applyFiles, navigate, notice } = useApp()
  const [name, setName] = useState('')

  const openPreset = (files: Parameters<typeof serializeFiles>[0], label: string): void => {
    applyFiles(files, serializeFiles(files), label)
    navigate('graph')
  }

  const handleSave = (): void => {
    saveProject(name)
    setName('')
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="PROJECT LIBRARY"
        title="项目库"
        description="三份由同一示例源码派生的项目可直接打开；当前图谱也能一键保存到浏览器本地。"
        actions={<button type="button" className="btn btn-primary" onClick={() => openPreset(projectPresets[0].files, '已加载全量示例项目')}>打开全量示例</button>}
      />

      <section className="section">
        <div className="section-title"><h2>内置示例</h2><span>3 个项目</span></div>
        <div className="card-grid-3">
          {projectPresets.map((preset) => {
            const model = buildGraph(preset.files)
            return (
              <article key={preset.id} className={`project-card tone-${preset.tone}`}>
                <div className="project-card-top">
                  <span className="project-icon">{preset.tone === 'purple' ? '⬡' : preset.tone === 'green' ? '◇' : '◈'}</span>
                  <span className="project-badge">{model.nodes.length} FILES</span>
                </div>
                <h3>{preset.name}</h3>
                <p>{preset.description}</p>
                <div className="project-metrics">
                  <span><strong>{model.nodes.length}</strong> 文件</span>
                  <span><strong>{model.edges.length}</strong> 依赖</span>
                  <span className="is-warn"><strong>{model.cycles.length}</strong> 环</span>
                </div>
                <div className="mini-graph" aria-hidden="true">
                  {model.nodes.slice(0, 12).map((node, index) => {
                    const angle = (index / Math.min(model.nodes.length, 12)) * Math.PI * 2
                    return (
                      <i
                        key={node.id}
                        style={{
                          left: `${50 + Math.cos(angle) * 34}%`,
                          top: `${50 + Math.sin(angle) * 34}%`,
                          width: `${5 + Math.min(node.degree, 8)}px`,
                          height: `${5 + Math.min(node.degree, 8)}px`,
                        }}
                      />
                    )
                  })}
                </div>
                <button type="button" className="btn btn-primary project-open" onClick={() => openPreset(preset.files, `已加载${preset.name}`)}>
                  查看图谱 →
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-title"><h2>我的项目</h2><span>保存在 localStorage</span></div>
        <div className="panel-card">
          <div className="save-row">
            <input
              className="text-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="给当前图谱起个名字…"
              onKeyDown={(event) => { if (event.key === 'Enter') handleSave() }}
            />
            <button type="button" className="btn btn-primary" onClick={handleSave}>保存当前项目</button>
          </div>
          <p className="hint-line">保存内容为该项目的源码文本，重新载入时会再次经过 AST 解析。{notice && <span className="hint-notice">{notice}</span>}</p>
          {projects.length === 0 ? (
            <div className="empty-state">还没有保存的项目。在图谱页解析代码后，回到这里保存一份。</div>
          ) : (
            <div className="data-list">
              {projects.map((project) => (
                <div key={project.id} className="data-row">
                  <div className="data-main">
                    <strong>{project.name}</strong>
                    <span>{formatTime(project.at)} · {project.files} 文件 · {project.edges} 依赖 · {project.cycles} 环</span>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const files = parseFilesFromText(project.text)
                        applyFiles(files, project.text, `已载入「${project.name}」`)
                        navigate('graph')
                      }}
                    >
                      载入
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => removeProject(project.id)}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
