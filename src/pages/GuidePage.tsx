import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'
import { serializeFiles } from '../parser'
import { sampleFiles } from '../sampleProject'

const steps = [
  { n: '01', title: '放入源码', body: '把代码粘贴到输入框，或上传多个文件；用 // @file 路径 标记每个文件的起点。' },
  { n: '02', title: '解析 AST', body: '点击「解析代码」，TypeScript 编译器会把源码变成语法树，提取静态依赖关系。' },
  { n: '03', title: '观察图谱', body: '拖拽节点、滚轮缩放、按目录或类型着色；搜索文件名可聚焦它的直接邻居。' },
  { n: '04', title: '拆解问题', body: '进入循环依赖、孤儿与枢纽页面，按建议调整模块边界，再回来验证图谱是否变健康。' },
]

export function GuidePage() {
  const { applyFiles, navigate } = useApp()

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="QUICK GUIDE"
        title="使用指南"
        description="四步从一段源码走到可读的依赖图，并了解背后 AST 解析与多文件分隔的工作方式。"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              applyFiles(sampleFiles, serializeFiles(sampleFiles), '已加载内置示例项目')
              navigate('graph')
            }}
          >
            用示例项目试一遍 →
          </button>
        }
      />

      <section className="section">
        <div className="section-title"><h2>四步玩法</h2><span>从输入到重构</span></div>
        <div className="card-grid-4">
          {steps.map((step) => (
            <article key={step.n} className="step-card">
              <span className="step-number">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title"><h2>AST 解析原理</h2><span>TypeScript Compiler API</span></div>
        <div className="card-grid-3">
          <article className="panel-card">
            <span className="concept-icon">◇</span>
            <h3>语法树而不是正则</h3>
            <p><code>ts.createSourceFile()</code> 把每个文件解析成 AST。遍历节点时识别 import、export from、import type、动态 import() 与 require()，不会被注释或字符串里的假 import 误导。</p>
          </article>
          <article className="panel-card">
            <span className="concept-icon">⌁</span>
            <h3>相对路径解析</h3>
            <p>把 specifier 按当前文件目录归一化，再尝试补全 .ts / .tsx / .js 与 /index 等后缀；只保留项目内文件，裸模块不会污染图谱。</p>
          </article>
          <article className="panel-card">
            <span className="concept-icon">⟳</span>
            <h3>三色 DFS 找环</h3>
            <p>节点按未访问 / 在栈中 / 已完成三色标记，遇到回边即抽出一个有向环并去重。环内的边会在图谱上以红色高亮。</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-title"><h2>多文件格式</h2><span>// @file 分隔标记</span></div>
        <div className="card-grid-2">
          <section className="panel-card">
            <pre className="code-block tall">{`// @file src/types.ts
export interface Node { id: string }

// @file src/graph.ts
import type { Node } from './types'
export const first = (nodes: Node[]) => nodes[0]

// 也支持下面两种写法：
==== src/other.ts ====
---- src/legacy.ts ----`}</pre>
          </section>
          <section className="panel-card">
            <p className="hint-line">解析器逐行扫描标记，遇到新标记就把之前的内容归入上一个文件。没有标记的文本会被放进自动命名的 <code>src/untitled-N.ts</code>。</p>
            <ul className="bullet-list">
              <li>路径可以是相对路径，<code>.</code> 与 <code>..</code> 会被消解。</li>
              <li>同一个路径出现多次时，最后一段内容生效。</li>
              <li>语法有问题的文件会降级为空节点，并在输入页提示。</li>
              <li>上传整个目录时，浏览器提供的相对路径会被原样保留。</li>
            </ul>
            <button type="button" className="btn" onClick={() => navigate('input')}>去代码输入页 →</button>
          </section>
        </div>
      </section>

      <section className="section">
        <div className="section-title"><h2>图谱操作</h2><span>画布快捷键</span></div>
        <div className="shortcut-grid">
          <span><kbd>拖拽节点</kbd> 改变布局位置</span>
          <span><kbd>拖拽空白</kbd> 平移整个画布</span>
          <span><kbd>滚轮</kbd> 以鼠标为中心缩放</span>
          <span><kbd>点击节点</kbd> 聚焦它与直接邻居</span>
          <span><kbd>搜索框</kbd> 按路径过滤高亮</span>
          <span><kbd>↻ 重新布局</kbd> 重新撒点并收敛</span>
        </div>
      </section>
    </div>
  )
}
