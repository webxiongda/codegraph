import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'
import { connectedComponents, graphStats, maxDegree } from '../graph'

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const peak = Math.max(...values, 1)
  const points = values
    .map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${28 - (value / peak) * 24}`)
    .join(' ')
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  hint: string
  spark: number[]
  color: string
  warn?: boolean
}

function MetricCard({ label, value, hint, spark, color, warn }: MetricCardProps) {
  return (
    <article className={`metric-card${warn ? ' is-warn' : ''}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <Sparkline values={spark} color={color} />
      <span className="metric-hint">{hint}</span>
    </article>
  )
}

export function MetricsPage() {
  const { model } = useApp()
  const stats = graphStats(model)
  const peak = maxDegree(model.nodes)
  const components = connectedComponents(model)
  const cycleEdges = model.edges.filter((edge) => edge.isCycle).length
  const cycleRatio = model.edges.length ? cycleEdges / model.edges.length : 0

  const buckets = [0, 0, 0, 0, 0, 0]
  for (const node of model.nodes) buckets[Math.min(node.degree, 5)]++
  const bucketLabels = ['0', '1', '2', '3', '4', '5+']
  const barPeak = Math.max(...buckets, 1)
  const circumference = 2 * Math.PI * 46

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="STRUCTURE METRICS"
        title="指标面板"
        description="把依赖图压缩成可比较的数字与图形：规模、密度、耦合热点和模块连通性一目了然。"
      />

      <div className="metric-card-grid">
        <MetricCard label="文件数" value={stats.files} hint="参与解析的源码文件" spark={buckets} color="#22d3ee" />
        <MetricCard label="依赖边" value={stats.edges} hint="静态依赖总数" spark={buckets.slice(1)} color="#a78bfa" />
        <MetricCard label="循环依赖" value={stats.cycles} hint="有向环的数量" spark={model.cycles.map((cycle) => cycle.length)} color="#fb7185" warn />
        <MetricCard label="平均度数" value={stats.avgDegree} hint="每个文件的平均连接" spark={model.nodes.slice(0, 12).map((node) => node.degree)} color="#34d399" />
        <MetricCard label="最大度数" value={peak} hint="最繁忙的文件" spark={model.nodes.slice(0, 12).map((node) => node.outDegree)} color="#fbbf24" />
        <MetricCard label="连通分量" value={components.length} hint="忽略方向后的独立块" spark={components.slice(0, 12).map((group) => group.length)} color="#60a5fa" />
      </div>

      <div className="card-grid-2 metrics-detail">
        <section className="panel-card">
          <div className="section-title"><h2>度数分布</h2><span>横轴：度数 · 纵轴：文件数</span></div>
          <svg className="chart-svg" viewBox="0 0 620 210" role="img" aria-label="文件度数分布柱状图">
            <defs>
              <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((line) => (
              <line key={line} x1="42" x2="604" y1={30 + line * 42} y2={30 + line * 42} stroke="rgba(125,175,220,0.13)" strokeDasharray="4 6" />
            ))}
            {buckets.map((count, index) => {
              const height = (count / barPeak) * 120
              const x = 66 + index * 92
              return (
                <g key={bucketLabels[index]}>
                  <rect x={x} y={170 - height} width={56} height={Math.max(height, 2)} rx="6" fill="url(#bar-gradient)" />
                  <text x={x + 28} y={164 - height} textAnchor="middle" className="chart-value">{count}</text>
                  <text x={x + 28} y="192" textAnchor="middle" className="chart-axis">{bucketLabels[index]}</text>
                </g>
              )
            })}
            <text x="8" y="34" className="chart-axis">{barPeak}</text>
            <text x="14" y="172" className="chart-axis">0</text>
          </svg>
        </section>

        <section className="panel-card">
          <div className="section-title"><h2>环内依赖占比</h2><span>{cycleEdges} / {model.edges.length} 条边</span></div>
          <div className="donut-wrap">
            <svg viewBox="0 0 120 120" className="donut" role="img" aria-label="循环依赖边占比环形图">
              <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(120,170,210,0.14)" strokeWidth="12" />
              <circle
                cx="60" cy="60" r="46" fill="none" stroke="#fb7185" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${cycleRatio * circumference} ${circumference}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="donut-center">
              <strong>{Math.round(cycleRatio * 100)}%</strong>
              <span>的边处于环中</span>
            </div>
          </div>
          <p className="hint-line">环内边越多，修改一处代码越容易牵动整组模块。优先拆解高环占比的项目。</p>
        </section>
      </div>

      <section className="panel-card">
        <div className="section-title"><h2>连通分量</h2><span>按文件数排序 · 显示前 6 组</span></div>
        {components.length === 0 ? (
          <div className="empty-state">当前没有可统计的文件。</div>
        ) : (
          <ul className="component-list">
            {components.slice(0, 6).map((group, index) => (
              <li key={group[0]}>
                <span className="rank">#{index + 1}</span>
                <span className="component-files" title={group.join('\n')}>{group.map((id) => id.split('/').pop()).join(' · ')}</span>
                <span className="rank-track"><i style={{ width: `${(group.length / Math.max(components[0].length, 1)) * 100}%` }} /></span>
                <strong>{group.length}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
