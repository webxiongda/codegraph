import { useMemo } from 'react'
import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'
import { findCycles } from '../graph'
import type { GraphNode } from '../types'

function adviceFor(cycle: string[], nodes: Map<string, GraphNode>): string {
  const label = (id: string): string => nodes.get(id)?.label ?? id
  const from = cycle[cycle.length - 1]
  const to = cycle[0]
  if (cycle.length === 2) {
    return `「${label(from)}」与「${label(to)}」互相引用。把两边共用的类型、常量或工具函数抽到独立模块（如 src/types.ts），只保留单向依赖；运行时才需要的调用可改用依赖注入。`
  }
  return `优先打断 ${label(from)} → ${label(to)} 这条边：将 ${label(to)} 暴露给 ${label(from)} 的能力抽成接口或中间模块，让依赖指向抽象；若只在特定时机需要，可用 import() 动态加载。`
}

export function CyclesPage() {
  const { model, openInGraph, navigate } = useApp()
  const nodeMap = useMemo(() => new Map(model.nodes.map((node) => [node.id, node])), [model.nodes])
  const cycles = useMemo(
    () => findCycles(model.nodes.map((node) => node.id), model.edges),
    [model.nodes, model.edges],
  )
  const involved = new Set(cycles.flat())
  const longest = cycles.reduce((max, cycle) => Math.max(max, cycle.length), 0)

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="CYCLE DETECTOR"
        title="循环依赖"
        description="用 DFS 三色标记遍历依赖图，找出每一个有向环；点击链条上的文件即可回到图谱查看它的真实位置。"
        actions={<button type="button" className="btn" onClick={() => navigate('graph')}>← 返回图谱</button>}
      />

      <div className="metric-strip">
        <span className="is-warn"><strong>{cycles.length}</strong> 个环</span>
        <span><strong>{involved.size}</strong> 个文件卷入</span>
        <span><strong>{longest}</strong> 层最长环</span>
        <span><strong>{model.edges.filter((edge) => edge.isCycle).length}</strong> 条环内边</span>
      </div>

      {cycles.length === 0 ? (
        <div className="panel-card">
          <div className="empty-state large">
            <span className="empty-glyph">✓</span>
            <strong>没有检测到循环依赖</strong>
            <p>当前依赖图是无环的，模块分层清晰。继续写代码时保持依赖单向流动即可。</p>
            <button type="button" className="btn" onClick={() => navigate('graph')}>回到图谱工作台</button>
          </div>
        </div>
      ) : (
        <div className="cycle-page-list">
          {cycles.map((cycle, index) => (
            <article key={cycle.join('>')} className="panel-card cycle-detail">
              <div className="cycle-detail-head">
                <span className="cycle-number">环 {String(index + 1).padStart(2, '0')}</span>
                <span className="cycle-length">{cycle.length} 个文件</span>
                <button type="button" className="btn btn-relayout" onClick={() => openInGraph(cycle)}>在图谱中高亮</button>
              </div>
              <div className="cycle-chain">
                {cycle.map((id, position) => (
                  <span key={id} className="chain-item">
                    <button type="button" onClick={() => openInGraph([id])} title={id}>
                      {nodeMap.get(id)?.label ?? id}
                    </button>
                    {position < cycle.length - 1 && <i className="chain-arrow">→</i>}
                  </span>
                ))}
                <i className="chain-arrow">↩</i>
              </div>
              <div className="advice-box">
                <strong>如何打破这个环</strong>
                <p>{adviceFor(cycle, nodeMap)}</p>
                <ul>
                  <li>把公共类型与常量下沉到无依赖的 <code>src/types.ts</code>。</li>
                  <li>上层模块依赖抽象接口，而不是直接引用下层实现。</li>
                  <li>确实是运行时按需使用的依赖，改为 <code>import()</code> 动态导入。</li>
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
