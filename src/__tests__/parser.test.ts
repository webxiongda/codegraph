import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  extensionOf,
  parseFilesFromText,
  buildGraph,
  serializeFiles,
} from '../parser'
import type { SourceFile } from '../types'

describe('normalizePath', () => {
  it('反斜杠统一成正斜杠并去多余分隔符', () => {
    expect(normalizePath('a\\b\\c.ts')).toBe('a/b/c.ts')
    expect(normalizePath('src//a.ts')).toBe('src/a.ts')
  })

  it('消解 . 与 .. 段', () => {
    expect(normalizePath('src/./a.ts')).toBe('src/a.ts')
    expect(normalizePath('src/lib/../a.ts')).toBe('src/a.ts')
    expect(normalizePath('../a.ts')).toBe('../a.ts')
  })

  it('保留绝对路径前缀并 trim 空白', () => {
    expect(normalizePath('  /src/a.ts  ')).toBe('/src/a.ts')
    expect(normalizePath('')).toBe('')
  })
})

describe('extensionOf', () => {
  it('识别全部文件类型且大小写不敏感', () => {
    expect(extensionOf('a.tsx')).toBe('tsx')
    expect(extensionOf('a.jsx')).toBe('jsx')
    expect(extensionOf('a.ts')).toBe('ts')
    expect(extensionOf('a.mts')).toBe('ts')
    expect(extensionOf('a.js')).toBe('js')
    expect(extensionOf('a.mjs')).toBe('js')
    expect(extensionOf('A.TSX')).toBe('tsx')
  })

  it('未知扩展名归为 other', () => {
    expect(extensionOf('a.txt')).toBe('other')
    expect(extensionOf('Makefile')).toBe('other')
  })
})

describe('parseFilesFromText', () => {
  it('识别 // @file 标记分隔的多文件', () => {
    const text = '// @file src/a.ts\nconst a = 1\n// @file src/b.ts\nconst b = 2'
    const files = parseFilesFromText(text)
    expect(files).toHaveLength(2)
    expect(files[0].path).toBe('src/a.ts')
    expect(files[1].path).toBe('src/b.ts')
    expect(files[1].content).toContain('const b = 2')
  })

  it('识别 ==== 与 ---- 分隔标记', () => {
    expect(parseFilesFromText('==== src/x.ts ====\nconst x = 1')[0].path).toBe('src/x.ts')
    expect(parseFilesFromText('--- src/y.ts ---\nconst y = 1')[0].path).toBe('src/y.ts')
  })

  it('无标记内容归为匿名文件', () => {
    const files = parseFilesFromText('const solo = 1')
    expect(files).toHaveLength(1)
    expect(files[0].path).toContain('untitled')
  })

  it('空文本也返回单条记录而不是空数组', () => {
    const files = parseFilesFromText('')
    expect(files).toHaveLength(1)
    expect(files[0].content).toBe('')
  })
})

describe('buildGraph', () => {
  it('解析相对 import 并生成依赖边', () => {
    const files: SourceFile[] = [
      { path: 'src/a.ts', content: "import { b } from './b'" },
      { path: 'src/b.ts', content: 'export const b = 1' },
    ]
    const g = buildGraph(files)
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(1)
    expect(g.edges[0]).toMatchObject({ source: 'src/a.ts', target: 'src/b.ts', kind: 'import' })
  })

  it('裸模块（node_modules）不纳入图谱', () => {
    const g = buildGraph([{ path: 'src/a.ts', content: "import React from 'react'" }])
    expect(g.edges).toHaveLength(0)
  })

  it('区分 type-only / dynamic / require 三种边', () => {
    const files: SourceFile[] = [
      {
        path: 'src/a.ts',
        content: "import type { T } from './t'\nconst m = import('./d')\nconst r = require('./r')",
      },
      { path: 'src/t.ts', content: 'export type T = string' },
      { path: 'src/d.ts', content: 'export const d = 1' },
      { path: 'src/r.ts', content: 'module.exports = {}' },
    ]
    const kinds = buildGraph(files).edges.map((e) => e.kind).sort()
    expect(kinds).toEqual(['dynamic', 'require', 'type'])
  })

  it('自环被识别为长度 1 的环', () => {
    const g = buildGraph([{ path: 'src/a.ts', content: "import './a'" }])
    expect(g.cycles).toHaveLength(1)
    expect(g.cycles[0]).toEqual(['src/a.ts'])
  })

  it('a→b→a 被识别为一个长度为 2 的环', () => {
    const g = buildGraph([
      { path: 'src/a.ts', content: "import './b'" },
      { path: 'src/b.ts', content: "import './a'" },
    ])
    expect(g.cycles).toHaveLength(1)
    expect(g.cycles[0]).toHaveLength(2)
    expect(g.edges.every((e) => e.isCycle)).toBe(true)
  })

  it('重复依赖只保留一条边', () => {
    const g = buildGraph([
      { path: 'src/a.ts', content: "import './b'\nimport { x } from './b'" },
      { path: 'src/b.ts', content: 'export const x = 1' },
    ])
    expect(g.edges).toHaveLength(1)
  })

  it('孤立文件度数保持 0', () => {
    const g = buildGraph([{ path: 'src/solo.ts', content: 'const x = 1' }])
    expect(g.nodes[0].degree).toBe(0)
  })
})

describe('serializeFiles', () => {
  it('序列化后能被 parseFilesFromText 往返还原', () => {
    const files: SourceFile[] = [
      { path: 'src/a.ts', content: 'const a = 1' },
      { path: 'src/b.ts', content: 'const b = 2' },
    ]
    const round = parseFilesFromText(serializeFiles(files))
    expect(round.map((f) => f.path)).toEqual(['src/a.ts', 'src/b.ts'])
  })
})
