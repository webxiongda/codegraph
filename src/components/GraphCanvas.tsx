import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GraphModel, GraphNode } from '../types'
import { dirColor, kindColor } from '../graph'

interface GraphCanvasProps {
  model: GraphModel
  focusIds: Set<string> | null
  colorMode: 'dir' | 'kind'
  resetToken: number
  onSelect: (id: string | null) => void
  nodeScale?: number
  showLabels?: boolean
  repulsion?: number
  highlightIds?: Set<string> | null
}

interface Point {
  x: number
  y: number
  vx: number
  vy: number
}

const DEFAULT_REPULSION = 14000
const SPRING = 0.013
const REST_LENGTH = 236
const DAMPING = 0.86
const CENTER_PULL = 0.0011

export function GraphCanvas({ model, focusIds, colorMode, resetToken, onSelect, nodeScale = 1, showLabels = true, repulsion = DEFAULT_REPULSION, highlightIds = null }: GraphCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pointsRef = useRef(new Map<string, Point>())
  const transformRef = useRef({ x: 0, y: 0, k: 1 })
  const dragRef = useRef<string | null>(null)
  const panRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null)
  const energyRef = useRef(1)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [size, setSize] = useState({ w: 960, h: 640 })
  const [hover, setHover] = useState<string | null>(null)
  const [, forceRender] = useState(0)
  const sizeRef = useRef(size)
  sizeRef.current = size

  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setSize({ w: Math.max(320, rect.width), h: Math.max(320, rect.height) })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // 模型或布局令牌变化时重新撒点，保证每次「重新布局」都有可见变化
  useEffect(() => {
    const { w, h } = sizeRef.current
    const count = model.nodes.length
    const map = new Map<string, Point>()
    model.nodes.forEach((node, index) => {
      const angle = (index / Math.max(count, 1)) * Math.PI * 2
      const radius = Math.min(w, h) * 0.29 * (0.78 + ((index * 37) % 17) / 44)
      map.set(node.id, {
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      })
    })
    pointsRef.current = map
    energyRef.current = 1
    transformRef.current = { x: 0, y: 0, k: 1 }
    setTransform({ x: 0, y: 0, k: 1 })
    setHover(null)
    forceRender((value) => value + 1)
  }, [model, resetToken])

  // 容器尺寸变化时整体平移，避免图形突然跳回原点
  const previousSize = useRef(size)
  useEffect(() => {
    const deltaX = (size.w - previousSize.current.w) / 2
    const deltaY = (size.h - previousSize.current.h) / 2
    if (deltaX || deltaY) {
      for (const point of pointsRef.current.values()) {
        point.x += deltaX
        point.y += deltaY
      }
    }
    previousSize.current = size
    energyRef.current = Math.max(energyRef.current, 0.35)
  }, [size])

  // 力导向模拟：斥力 + 弹簧引力 + 向心力 + 阻尼，能量收敛后停止 React 重绘
  useEffect(() => {
    let frame = 0
    const step = (): void => {
      const points = pointsRef.current
      const nodes = model.nodes
      let energy = 0

      for (let i = 0; i < nodes.length; i++) {
        const a = points.get(nodes[i].id)
        if (!a) continue
        for (let j = i + 1; j < nodes.length; j++) {
          const b = points.get(nodes[j].id)
          if (!b) continue
          let dx = b.x - a.x
          let dy = b.y - a.y
          let distanceSq = dx * dx + dy * dy
          if (distanceSq < 1) {
            dx = ((i * 13 + j * 7) % 11 - 5) * 0.1 + 0.1
            dy = ((i * 5 + j * 3) % 13 - 6) * 0.1 + 0.1
            distanceSq = dx * dx + dy * dy
          }
          const distance = Math.sqrt(distanceSq)
          const force = repulsion / Math.max(distanceSq, 400)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force
          a.vx -= fx
          a.vy -= fy
          b.vx += fx
          b.vy += fy
        }
      }

      for (const edge of model.edges) {
        const a = points.get(edge.source)
        const b = points.get(edge.target)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01)
        const force = SPRING * (distance - REST_LENGTH)
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }

      const { w, h } = sizeRef.current
      for (const node of nodes) {
        const point = points.get(node.id)
        if (!point) continue
        if (dragRef.current === node.id) {
          point.vx = 0
          point.vy = 0
          continue
        }
        point.vx = (point.vx + (w / 2 - point.x) * CENTER_PULL) * DAMPING
        point.vy = (point.vy + (h / 2 - point.y) * CENTER_PULL) * DAMPING
        point.vx = Math.max(-20, Math.min(20, point.vx))
        point.vy = Math.max(-20, Math.min(20, point.vy))
        point.x += point.vx
        point.y += point.vy
        energy += Math.abs(point.vx) + Math.abs(point.vy)
      }

      energyRef.current = energy / Math.max(nodes.length, 1)
      if (energyRef.current > 0.06 || dragRef.current) forceRender((value) => value + 1)
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [model, repulsion])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const rect = svg.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top
      const current = transformRef.current
      const nextScale = Math.max(0.35, Math.min(2.8, current.k * Math.exp(-event.deltaY * 0.0015)))
      const ratio = nextScale / current.k
      const next = {
        k: nextScale,
        x: mouseX - (mouseX - current.x) * ratio,
        y: mouseY - (mouseY - current.y) * ratio,
      }
      transformRef.current = next
      setTransform(next)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    const current = transformRef.current
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - current.x) / current.k,
      y: (clientY - rect.top - current.y) / current.k,
    }
  }, [])

  const onNodePointerDown = (event: ReactPointerEvent<SVGGElement>, id: string): void => {
    event.stopPropagation()
    dragRef.current = id
    energyRef.current = 1
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGRectElement>): void => {
    panRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: transformRef.current.x,
      y: transformRef.current.y,
    }
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (dragRef.current) {
      const point = pointsRef.current.get(dragRef.current)
      if (point) {
        const world = toWorld(event.clientX, event.clientY)
        point.x = world.x
        point.y = world.y
        point.vx = 0
        point.vy = 0
      }
      forceRender((value) => value + 1)
      return
    }
    if (panRef.current) {
      const pan = panRef.current
      const next = {
        ...transformRef.current,
        x: pan.x + event.clientX - pan.clientX,
        y: pan.y + event.clientY - pan.clientY,
      }
      transformRef.current = next
      setTransform(next)
    }
  }

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (dragRef.current) {
      dragRef.current = null
      energyRef.current = 1
    }
    panRef.current = null
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId)
    }
  }

  const zoomBy = (factor: number): void => {
    const { w, h } = sizeRef.current
    const current = transformRef.current
    const nextScale = Math.max(0.35, Math.min(2.8, current.k * factor))
    const ratio = nextScale / current.k
    const next = {
      k: nextScale,
      x: w / 2 - (w / 2 - current.x) * ratio,
      y: h / 2 - (h / 2 - current.y) * ratio,
    }
    transformRef.current = next
    setTransform(next)
  }

  const radiusOf = (node: GraphNode): number => Math.min(30 * nodeScale, (12 + Math.sqrt(node.degree) * 5) * nodeScale)

  const nodeById = new Map(model.nodes.map((node) => [node.id, node]))
  const points = pointsRef.current

  const hoveredNode = hover ? nodeById.get(hover) : undefined
  const hoveredPoint = hover ? points.get(hover) : undefined

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="graph-svg"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
          <marker id="arrow-normal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#5f7f9e" />
          </marker>
          <marker id="arrow-cycle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#fb7185" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="transparent" onPointerDown={onBackgroundPointerDown} />

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          <g className="graph-edges">
            {model.edges.map((edge) => {
              const a = points.get(edge.source)
              const b = points.get(edge.target)
              const target = nodeById.get(edge.target)
              if (!a || !b || !target) return null
              const dx = b.x - a.x
              const dy = b.y - a.y
              const length = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
              const ux = dx / length
              const uy = dy / length
              const startRadius = radiusOf(nodeById.get(edge.source) ?? target) + 4
              const endRadius = radiusOf(target) + 9
              const bend = Math.min(length * 0.12, 34)
              const midX = (a.x + b.x) / 2 - uy * bend
              const midY = (a.y + b.y) / 2 + ux * bend
              const path = `M ${a.x + ux * startRadius} ${a.y + uy * startRadius} Q ${midX} ${midY} ${b.x - ux * endRadius} ${b.y - uy * endRadius}`
              const dimmed = (focusIds && !(focusIds.has(edge.source) && focusIds.has(edge.target)))
                || (!!highlightIds && !(highlightIds.has(edge.source) && highlightIds.has(edge.target)))
              return (
                <path
                  key={edge.id}
                  d={path}
                  className={edge.isCycle ? 'graph-edge graph-edge-cycle' : 'graph-edge'}
                  markerEnd={edge.isCycle ? 'url(#arrow-cycle)' : 'url(#arrow-normal)'}
                  opacity={dimmed ? 0.04 : edge.isCycle ? 0.95 : 0.55}
                />
              )
            })}
          </g>

          <g className="graph-nodes">
            {model.nodes.map((node) => {
              const point = points.get(node.id)
              if (!point) return null
              const radius = radiusOf(node)
              const color = colorMode === 'dir' ? dirColor(node.dir) : kindColor(node.kind)
              const highlighted = !!highlightIds && highlightIds.has(node.id)
              const dimmed = (!!focusIds && !focusIds.has(node.id)) || (!!highlightIds && !highlighted)
              const selected = node.id === hover
              return (
                <g
                  key={node.id}
                  className={`graph-node${dimmed ? ' is-dim' : ''}`}
                  transform={`translate(${point.x}, ${point.y})`}
                  onPointerDown={(event) => onNodePointerDown(event, node.id)}
                  onPointerEnter={() => setHover(node.id)}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect(node.id)
                  }}
                >
                  <circle r={radius + 10} fill={color} opacity={selected ? 0.3 : 0.16} filter="url(#node-glow)" />
                  <circle
                    r={radius}
                    fill={color}
                    fillOpacity={0.16}
                    stroke={color}
                    strokeWidth={selected ? 3 : 2}
                    className="graph-node-core"
                  />
                  <circle r={Math.max(3.5, radius * 0.3)} fill={color} />
                  {highlighted && (
                    <circle r={radius + 8} fill="none" stroke="#a5f3fc" strokeWidth={1.6} strokeDasharray="4 4" opacity={0.95} />
                  )}
                  {showLabels && (
                    <text y={radius + 17} textAnchor="middle" className="graph-node-label">
                      {node.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      {model.nodes.length === 0 && (
        <div className="canvas-empty">
          <div className="canvas-empty-icon">◇</div>
          <strong>还没有可展示的文件</strong>
          <span>粘贴代码、上传文件，或加载内置示例项目</span>
        </div>
      )}

      {hoveredNode && hoveredPoint && (
        <div
          className="graph-tooltip"
          style={{
            left: hoveredPoint.x * transform.k + transform.x + 18,
            top: hoveredPoint.y * transform.k + transform.y - 12,
          }}
        >
          <strong>{hoveredNode.path}</strong>
          <span>入度 {hoveredNode.inDegree} · 出度 {hoveredNode.outDegree} · 总度数 {hoveredNode.degree}</span>
        </div>
      )}

      <div className="canvas-toolbar">
        <button type="button" onClick={() => zoomBy(1.2)} title="放大">＋</button>
        <button type="button" onClick={() => zoomBy(1 / 1.2)} title="缩小">－</button>
        <button
          type="button"
          onClick={() => {
            transformRef.current = { x: 0, y: 0, k: 1 }
            setTransform({ x: 0, y: 0, k: 1 })
          }}
          title="重置视图"
        >
          ⤢
        </button>
      </div>

      <div className="canvas-legend">
        <span><i className="legend-dot legend-normal" /> 普通依赖</span>
        <span><i className="legend-dot legend-cycle" /> 循环依赖</span>
        <span className="legend-hint">滚轮缩放 · 拖拽节点 · 空白处平移</span>
      </div>
    </div>
  )
}
