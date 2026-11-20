export interface NavItem {
  id: string
  label: string
  icon: string
  blurb: string
}

export const NAV_ITEMS = [
  { id: 'graph', label: '图谱工作台', icon: '◈', blurb: '拖拽、缩放与聚焦依赖图' },
  { id: 'projects', label: '项目库', icon: '▦', blurb: '内置示例与本地保存的项目' },
  { id: 'files', label: '文件浏览器', icon: '☰', blurb: '按目录查看每个文件的连接度' },
  { id: 'cycles', label: '循环依赖', icon: '⟳', blurb: '找出环并给出拆解建议' },
  { id: 'orphans', label: '孤儿与枢纽', icon: '◎', blurb: '孤立文件与高连接文件排名' },
  { id: 'input', label: '代码输入', icon: '⌨', blurb: '粘贴源码或上传整个目录' },
  { id: 'metrics', label: '指标面板', icon: '▤', blurb: '用图表读懂项目结构' },
  { id: 'guide', label: '使用指南', icon: '?', blurb: '四步上手与 AST 原理' },
  { id: 'about', label: '关于与热点', icon: 'ⓘ', blurb: '灵感来源、技术栈与许可' },
  { id: 'settings', label: '设置', icon: '⚙', blurb: '调整图谱外观并持久化' },
] as const satisfies readonly NavItem[]

export type RouteId = (typeof NAV_ITEMS)[number]['id']

const VALID = new Set<string>(NAV_ITEMS.map((item) => item.id))

/** hash 容错：#/cycles、#cycles、#/cycles/ 都能正确识别，未知路径回落到图谱页 */
export function parseRouteHash(hash: string): RouteId {
  const raw = hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '').toLowerCase()
  return VALID.has(raw) ? (raw as RouteId) : 'graph'
}
