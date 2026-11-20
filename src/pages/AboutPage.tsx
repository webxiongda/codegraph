import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'

const evidence = [
  {
    name: 'graphify',
    metric: '10.6k+',
    unit: 'GitHub Stars',
    body: '把代码库变成可交互的 3D 依赖关系图，证明了「把结构画出来」是开发者愿意收藏的刚需。',
    href: 'https://github.com/sickgyun/graphify',
  },
  {
    name: 'dependency-cruiser',
    metric: '生态',
    unit: '持续活跃',
    body: '依赖规则校验工具长期活跃，说明循环依赖与模块边界治理是长期存在的工程问题。',
    href: 'https://github.com/sverweij/dependency-cruiser',
  },
  {
    name: 'madge',
    metric: '经典',
    unit: '环检测工具',
    body: '专注可视化与找环的小工具被广泛使用，验证了 DFS 环检测在这一场景的实用性。',
    href: 'https://github.com/pahen/madge',
  },
]

const stack = [
  { name: 'React 18', role: '界面与状态' },
  { name: 'TypeScript 5.6', role: '类型与编译器 API' },
  { name: 'Vite 6', role: '构建与开发服务器' },
  { name: 'SVG Force Layout', role: '自研力导向布局' },
  { name: 'Hash Router', role: '10 页导航，iframe 友好' },
  { name: 'localStorage', role: '设置、历史与项目持久化' },
]

export function AboutPage() {
  const { model, navigate } = useApp()

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="ABOUT & SIGNALS"
        title="关于与热点"
        description="CodeGraph 是一个完全在浏览器里运行的依赖可视化实验：代码不上传，图谱只属于你。"
        actions={<button type="button" className="btn" onClick={() => navigate('graph')}>← 返回图谱</button>}
      />

      <section className="about-hero panel-card">
        <div>
          <span className="page-eyebrow">WHY CODE GRAPHS</span>
          <h2>让隐形的依赖，变成看得见的结构。</h2>
          <p>当前项目共 {model.nodes.length} 个文件、{model.edges.length} 条依赖、{model.cycles.length} 个环。每一次点击、拖拽和拆解建议，都基于真实的 AST 解析结果，而不是示意图。</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('metrics')}>查看结构指标 →</button>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-ring one" /><span className="orbit-ring two" />
          <i className="orbit-core">CG</i>
          <i className="orbit-dot d1" /><i className="orbit-dot d2" /><i className="orbit-dot d3" />
        </div>
      </section>

      <section className="section">
        <div className="section-title"><h2>热点证据</h2><span>社区信号 · 星标数会随时间变化</span></div>
        <div className="card-grid-3">
          {evidence.map((item) => (
            <a key={item.name} className="evidence-card" href={item.href} target="_blank" rel="noreferrer">
              <div className="evidence-head"><strong>{item.name}</strong><span>↗</span></div>
              <div className="evidence-metric">{item.metric}<small>{item.unit}</small></div>
              <p>{item.body}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title"><h2>技术栈</h2><span>零新增运行时依赖</span></div>
        <div className="stack-grid">
          {stack.map((item) => (
            <div key={item.name} className="stack-item"><strong>{item.name}</strong><span>{item.role}</span></div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title"><h2>许可与隐私</h2><span>MIT</span></div>
        <div className="panel-card license-card">
          <p><strong>MIT License</strong> · Copyright (c) 2026 CodeGraph contributors。允许使用、复制、修改与再发布，需保留许可声明，按「原样」提供。</p>
          <p>所有源码解析、图计算与持久化都在本地浏览器完成；项目与历史记录只保存在 localStorage，不发送到任何服务器。</p>
        </div>
      </section>
    </div>
  )
}
