import { useApp } from '../appContext'
import { PageHeader } from '../components/PageHeader'
import type { GraphSettings } from '../types'

const DEFAULTS: GraphSettings = { nodeScale: 1, showLabels: true, repulsion: 14000 }

interface SliderProps {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}

function Slider({ label, hint, value, min, max, step, display, onChange }: SliderProps) {
  const progress = ((value - min) / (max - min)) * 100
  return (
    <label className="setting-row">
      <span className="setting-label"><strong>{label}</strong><em>{hint}</em></span>
      <span className="setting-control">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ background: `linear-gradient(90deg, var(--cyan) ${progress}%, rgba(120,170,210,0.16) ${progress}%)` }}
        />
        <b>{display}</b>
      </span>
    </label>
  )
}

export function SettingsPage() {
  const { settings, updateSettings, model, navigate } = useApp()
  const previewNodes = model.nodes.slice(0, 8)
  const radiusOf = (degree: number): number => Math.min(30 * settings.nodeScale, (12 + Math.sqrt(degree) * 5) * settings.nodeScale)

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="APPEARANCE"
        title="设置"
        description="调整节点尺寸、标签显示与斥力强度；改动会立刻写入 localStorage，并应用到图谱工作台。"
        actions={<button type="button" className="btn" onClick={() => navigate('graph')}>← 返回图谱</button>}
      />

      <div className="card-grid-2 settings-layout">
        <section className="panel-card">
          <div className="section-title"><h2>图谱外观</h2><span>自动保存</span></div>
          <Slider
            label="节点大小"
            hint="按度数计算后的缩放倍率"
            value={settings.nodeScale}
            min={0.6}
            max={1.8}
            step={0.1}
            display={`${settings.nodeScale.toFixed(1)}×`}
            onChange={(nodeScale) => updateSettings({ nodeScale })}
          />
          <Slider
            label="斥力强度"
            hint="数值越大，节点间距越疏"
            value={settings.repulsion}
            min={4000}
            max={30000}
            step={1000}
            display={String(settings.repulsion)}
            onChange={(repulsion) => updateSettings({ repulsion })}
          />
          <label className="setting-row toggle-row">
            <span className="setting-label"><strong>显示节点标签</strong><em>关闭后画布更清爽</em></span>
            <span className="setting-control">
              <input
                type="checkbox"
                checked={settings.showLabels}
                onChange={(event) => updateSettings({ showLabels: event.target.checked })}
              />
              <b>{settings.showLabels ? '开启' : '关闭'}</b>
            </span>
          </label>
          <div className="settings-footer">
            <button type="button" className="btn" onClick={() => updateSettings(DEFAULTS)}>恢复默认值</button>
            <span>当前配置：{settings.nodeScale.toFixed(1)}× · {settings.repulsion} 斥力 · 标签{settings.showLabels ? '开' : '关'}</span>
          </div>
        </section>

        <section className="panel-card">
          <div className="section-title"><h2>实时预览</h2><span>取自当前项目的前 {previewNodes.length} 个节点</span></div>
          <div className="preview-stage">
            <svg viewBox="0 0 400 260" className="preview-svg" role="img" aria-label="图谱外观预览">
              {previewNodes.slice(1).map((node, index) => {
                const angle = (index / Math.max(previewNodes.length - 1, 1)) * Math.PI * 2
                const x = 200 + Math.cos(angle) * 116
                const y = 130 + Math.sin(angle) * 84
                return <line key={`line-${node.id}`} x1="200" y1="130" x2={x} y2={y} stroke="rgba(125,175,220,0.25)" strokeWidth="1.5" />
              })}
              {previewNodes.map((node, index) => {
                const angle = (index / Math.max(previewNodes.length, 1)) * Math.PI * 2
                const x = index === 0 ? 200 : 200 + Math.cos(angle) * 116
                const y = index === 0 ? 130 : 130 + Math.sin(angle) * 84
                const radius = radiusOf(node.degree)
                return (
                  <g key={node.id}>
                    <circle cx={x} cy={y} r={radius} fill="rgba(34,211,238,0.18)" stroke="#22d3ee" strokeWidth="2" />
                    <circle cx={x} cy={y} r={Math.max(3, radius * 0.3)} fill="#a78bfa" />
                    {settings.showLabels && (
                      <text x={x} y={y + radius + 14} textAnchor="middle" className="preview-label">{node.label}</text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
          <p className="hint-line">预览按当前设置渲染节点半径与标签；斥力会在返回图谱并重新布局后体现在实际画布上。</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('graph')}>在图谱中查看效果 →</button>
        </section>
      </div>
    </div>
  )
}
