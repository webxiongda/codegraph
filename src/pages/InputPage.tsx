import { useRef } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'
import { formatTime } from '../format'
import { graphStats } from '../graph'
import { parseFilesFromText, serializeFiles } from '../parser'
import { sampleFiles } from '../sampleProject'

const sampleText = serializeFiles(sampleFiles)

export function InputPage() {
  const { text, setText, applyFiles, history, removeHistory, model, navigate } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFiles = async (picked: File[]): Promise<void> => {
    if (picked.length === 0) return
    const loaded = await Promise.all(picked.map(async (file) => ({
      path: (file.webkitRelativePath || file.name).replace(/^\/+/, ''),
      content: await file.text(),
    })))
    applyFiles(loaded, serializeFiles(loaded), `已导入 ${loaded.length} 个文件`)
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    void loadFiles(picked)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    void loadFiles(Array.from(event.dataTransfer.files))
  }

  const stats = graphStats(model)

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="SOURCE INPUT"
        title="代码输入"
        description="把多个源码文件粘贴进同一个文本框，或用 // @file 标记分隔；解析完全在本地进行，源码不会离开浏览器。"
        actions={<button type="button" className="btn" onClick={() => navigate('graph')}>← 返回图谱</button>}
      />

      <div className="input-layout">
        <section className="panel-card input-main">
          <div className="section-title"><h2>粘贴源码</h2><span>{text.length.toLocaleString('zh-CN')} 字符</span></div>
          <textarea
            className="code-input big"
            spellCheck={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={'// @file src/index.ts\nexport const hello = 1\n\n// @file src/app.ts\nimport { hello } from "./index"'}
          />
          <div className="button-row input-actions">
            <button type="button" className="btn btn-primary" onClick={() => applyFiles(parseFilesFromText(text), text, '解析完成')}>
              ⚡ 解析并生成图谱
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>上传文件</button>
            <button type="button" className="btn" onClick={() => applyFiles(sampleFiles, sampleText, '已加载内置示例项目')}>加载示例</button>
            <button type="button" className="btn btn-ghost" onClick={() => setText('')}>清空文本框</button>
          </div>
          <input ref={fileRef} type="file" multiple accept=".ts,.tsx,.js,.jsx,.mjs,.cjs,.d.ts" className="visually-hidden" onChange={handleInput} />
          <div
            className="drop-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <span className="drop-icon">⇩</span>
            <strong>把文件或整个目录拖到这里</strong>
            <span>支持 .ts / .tsx / .js / .jsx，目录中的相对路径会被保留</span>
          </div>
          <p className="hint-line">当前图谱：{stats.files} 个文件 · {stats.edges} 条依赖 · {stats.cycles} 个环</p>
          {model.parseErrors.length > 0 && (
            <div className="error-box">
              <strong>⚠ {model.parseErrors.length} 个文件解析降级</strong>
              {model.parseErrors.slice(0, 3).map((error) => <span key={error.path}>{error.path}：{error.message}</span>)}
            </div>
          )}
        </section>

        <aside className="input-side">
          <section className="panel-card">
            <div className="section-title"><h2>多文件格式</h2><span>// @file</span></div>
            <pre className="code-block">{`// @file src/utils/math.ts
export const sum = (a: number, b: number) => a + b

// @file src/App.tsx
import { sum } from './utils/math'
export const total = sum(1, 2)`}</pre>
            <p className="hint-line">也支持 <code>==== src/a.ts ====</code> 与 <code>---- src/b.ts ----</code> 分隔符；未标记内容会归入自动命名的文件。</p>
          </section>

          <section className="panel-card">
            <div className="section-title"><h2>解析历史</h2><span>{history.length} / 12</span></div>
            {history.length === 0 ? (
              <div className="empty-state">完成一次解析后，这里会记录可重新载入的源码快照。</div>
            ) : (
              <div className="data-list compact">
                {history.map((entry) => (
                  <div key={entry.id} className="data-row">
                    <div className="data-main">
                      <strong>{entry.label}</strong>
                      <span>{formatTime(entry.at)} · {entry.files} 文件 · {entry.edges} 依赖</span>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => applyFiles(parseFilesFromText(entry.text), entry.text, '已从历史载入')}
                      >
                        载入
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => removeHistory(entry.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
