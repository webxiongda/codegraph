import { useMemo } from 'react'
import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'
import { dirColor, hubNodes, orphanNodes } from '../graph'
import type { GraphNode } from '../types'

export function OrphansPage() {
  const { model, openInGraph, navigate } = useApp()
  const orphans = useMemo(() => orphanNodes(model.nodes), [model.nodes])
  const hubs = useMemo(() => hubNodes(model.nodes, 10), [model.nodes])
  const peak = hubs[0]?.degree ?? 1
  const connected = model.nodes.length - orphans.length

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="ORPHANS & HUBS"
        title="孤儿与枢纽"
        description="度数揭示了模块的处境：孤儿无人连接，枢纽牵一发而动全身。两者都值得在重构时优先关注。"
        actions={<button type="button" className="btn" onClick={() => navigate('graph')}>← 返回图谱</button>}
      />

      <div className="metric-strip">
        <span><strong>{orphans.length}</strong> 个孤儿</span>
        <span><strong>{hubs.length}</strong> 个枢纽上榜</span>
        <span><strong>{connected}</strong> 个有连接的文件</span>
        <span><strong>{peak}</strong> 最高度数</span>
      </div>

      <div className="card-grid-2">
        <section className="panel-card">
          <div className="section-title"><h2>孤儿节点</h2><span>度数 = 0</span></div>
          <p className="hint-line">没有任何静态依赖进出的文件。它可能是尚未接入的草稿、被遗忘的配置，或者一个完全独立的工具。</p>
          {orphans.length === 0 ? (
            <div className="empty-state">所有文件都至少有一条依赖，没有孤儿 ✓</div>
          ) : (
            <ul className="plain-list roomy">
              {orphans.map((node) => (
                <li key={node.id}>
                  <button type="button" onClick={() => openInGraph([node.id])}>
                    <i className="file-dot" style={{ background: dirColor(node.dir) }} />
                    {node.path}
                    <span className="tag">孤儿</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel-card">
          <div className="section-title"><h2>枢纽排名</h2><span>Top 10 / 按总度数</span></div>
          <p className="hint-line">枢纽节点连接了大量文件，修改它们的影响面最大；保持这类文件小而稳定，能降低重构成本。</p>
          <ul className="hub-ranking">
            {hubs.map((node: GraphNode, index) => (
              <li key={node.id}>
                <button type="button" onClick={() => openInGraph([node.id])}>
                  <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="rank-name" title={node.path}>{node.label}</span>
                  <span className="rank-track"><i style={{ width: `${(node.degree / Math.max(peak, 1)) * 100}%` }} /></span>
                  <span className="rank-value">{node.degree}</span>
                  <span className="rank-split">入 {node.inDegree} / 出 {node.outDegree}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
