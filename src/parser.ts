import * as ts from 'typescript'
import type { DependencyEdge, EdgeKind, FileKind, GraphModel, ParseError, SourceFile } from './types'
import { findCycles } from './graph'

const EXTENSIONS = ['.d.ts', '.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs']

/** 统一路径分隔符并消解 . / ..，纯前端实现，不依赖 node:path */
export function normalizePath(input: string): string {
  const trimmed = input.replace(/\\/g, '/').trim()
  const absolute = trimmed.startsWith('/')
  const parts: string[] = []
  for (const segment of trimmed.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (parts.length > 0 && parts[parts.length - 1] !== '..') parts.pop()
      else if (!absolute) parts.push('..')
    } else {
      parts.push(segment)
    }
  }
  return (absolute ? '/' : '') + parts.join('/')
}

export function extensionOf(path: string): FileKind {
  const lower = path.toLowerCase()
  if (lower.endsWith('.tsx')) return 'tsx'
  if (lower.endsWith('.jsx')) return 'jsx'
  if (/\.(ts|mts|cts)$/.test(lower)) return 'ts'
  if (/\.(js|mjs|cjs)$/.test(lower)) return 'js'
  return 'other'
}

function scriptKindOf(kind: FileKind): ts.ScriptKind {
  switch (kind) {
    case 'tsx': return ts.ScriptKind.TSX
    case 'jsx': return ts.ScriptKind.JSX
    case 'js': return ts.ScriptKind.JS
    default: return ts.ScriptKind.TS
  }
}

function resolveSpecifier(spec: string, importer: string, known: Set<string>): string | null {
  const clean = spec.split(/[?#]/)[0]
  let base: string
  if (clean.startsWith('@/') || clean.startsWith('~/')) {
    base = normalizePath(clean.slice(2))
  } else if (clean.startsWith('.')) {
    const slash = importer.lastIndexOf('/')
    const dir = slash >= 0 ? importer.slice(0, slash) : ''
    base = normalizePath((dir ? dir + '/' : '') + clean)
  } else {
    // 裸模块（node_modules）不纳入文件节点，保持图谱聚焦项目内部结构
    return null
  }
  if (!base) return null

  const candidates: string[] = [base]
  for (const ext of EXTENSIONS) {
    candidates.push(base + ext)
    candidates.push(`${base}/index${ext}`)
  }
  for (const candidate of candidates) if (known.has(candidate)) return candidate
  return null
}

interface RawEdge {
  source: string
  target: string
  specifier: string
  kind: EdgeKind
}

/** 使用 typescript 编译器 AST 提取 import / export / dynamic import / require 依赖 */
function collectEdges(file: SourceFile, known: Set<string>): RawEdge[] {
  const sourceFile = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindOf(extensionOf(file.path)),
  )
  const result: RawEdge[] = []

  const push = (node: ts.Node, kind: EdgeKind): void => {
    if (!ts.isStringLiteralLike(node)) return
    const target = resolveSpecifier(node.text, file.path, known)
    if (target) result.push({ source: file.path, target, specifier: node.text, kind })
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      push(node.moduleSpecifier, node.importClause?.isTypeOnly ? 'type' : 'import')
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      push(node.moduleSpecifier, node.isTypeOnly ? 'type' : 'export')
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      push(node.argument.literal, 'type')
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      push(node.moduleReference.expression, 'import')
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression
      if (callee.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
        push(node.arguments[0], 'dynamic')
      } else if (ts.isIdentifier(callee) && callee.text === 'require' && node.arguments.length > 0) {
        push(node.arguments[0], 'require')
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return result
}

/** 把源码文件集合编译成图谱模型；单个文件出错不会影响其它文件 */
export function buildGraph(files: SourceFile[]): GraphModel {
  const byPath = new Map<string, SourceFile>()
  for (const file of files) {
    const path = normalizePath(file.path)
    if (path) byPath.set(path, { path, content: file.content })
  }

  const paths = [...byPath.keys()]
  const known = new Set(paths)
  const rawEdges: RawEdge[] = []
  const parseErrors: ParseError[] = []

  for (const path of paths) {
    const file = byPath.get(path)
    if (!file) continue
    try {
      rawEdges.push(...collectEdges(file, known))
    } catch (error) {
      // 优雅降级：语法异常的文件保留为孤立节点，并在面板中给出提示
      parseErrors.push({ path, message: error instanceof Error ? error.message : String(error) })
    }
  }

  const seen = new Set<string>()
  const edges: DependencyEdge[] = []
  const degreeMap = new Map<string, { incoming: number; outgoing: number }>()
  for (const path of paths) degreeMap.set(path, { incoming: 0, outgoing: 0 })

  for (const item of rawEdges) {
    const key = `${item.source}\u0000${item.target}`
    if (seen.has(key)) continue
    seen.add(key)
    edges.push({
      id: key,
      source: item.source,
      target: item.target,
      specifier: item.specifier,
      kind: item.kind,
      isCycle: false,
    })
    const from = degreeMap.get(item.source)
    const to = degreeMap.get(item.target)
    if (from) from.outgoing++
    if (to) to.incoming++
  }

  const cycles = findCycles(paths, edges)
  const cycleEdges = new Set<string>()
  for (const cycle of cycles) {
    for (let i = 0; i < cycle.length; i++) {
      cycleEdges.add(`${cycle[i]}\u0000${cycle[(i + 1) % cycle.length]}`)
    }
  }
  for (const edge of edges) edge.isCycle = cycleEdges.has(edge.id)

  const nodes = paths.map((path) => {
    const degree = degreeMap.get(path) ?? { incoming: 0, outgoing: 0 }
    const slash = path.lastIndexOf('/')
    return {
      id: path,
      path,
      label: slash >= 0 ? path.slice(slash + 1) : path,
      dir: slash > 0 ? path.slice(0, slash) : '.',
      kind: extensionOf(path),
      inDegree: degree.incoming,
      outDegree: degree.outgoing,
      degree: degree.incoming + degree.outgoing,
    }
  })

  return { nodes, edges, cycles, parseErrors }
}

function detectMarker(line: string): string | null {
  const atFile = line.match(/^\s*\/\/\s*@file\s+(.+?)\s*$/i)
  if (atFile) return atFile[1]
  const equals = line.match(/^\s*=+\s*(.+?)\s*=+\s*$/)
  if (equals) return equals[1]
  const dashes = line.match(/^\s*-{3,}\s+(.+?)\s+-{3,}\s*$/)
  if (dashes) return dashes[1]
  return null
}

/** 解析文本域内容，支持 // @file 路径、==== 路径 ==== 等文件分隔标记 */
export function parseFilesFromText(text: string): SourceFile[] {
  const files: SourceFile[] = []
  let current: { path: string; lines: string[] } | null = null
  let anonymous = 0

  const flush = (): void => {
    if (current) files.push({ path: current.path, content: current.lines.join('\n') })
    current = null
  }

  for (const line of text.split(/\r?\n/)) {
    const marker = detectMarker(line)
    if (marker) {
      flush()
      const path = normalizePath(marker)
      current = { path: path || `src/untitled-${++anonymous}.ts`, lines: [] }
    } else if (current) {
      current.lines.push(line)
    } else if (line.trim()) {
      current = { path: `src/untitled-${++anonymous}.ts`, lines: [line] }
    }
  }
  flush()

  if (files.length === 0) files.push({ path: 'src/untitled.ts', content: text })
  return files
}

export function serializeFiles(files: SourceFile[]): string {
  return files.map((file) => `// @file ${file.path}\n${file.content.trim()}`).join('\n\n')
}
