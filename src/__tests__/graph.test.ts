import { describe, it, expect } from 'vitest'
import {
  findCycles,
  graphStats,
  orphanNodes,
  hubNodes,
  maxDegree,
  connectedComponents,
  hashString,
} from '../graph'
import type { DependencyEdge, GraphModel, GraphNode } from '../types'

const edge = (source: string, target: string): DependencyEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  specifier: target,
  kind: 'import',
  isCycle: false,
})

const node = (id: string, degree: number): GraphNode => ({
  id,
  path: id,
  label: id,
  dir: '.',
  kind: 'ts',
  inDegree: 0,
  outDegree: 0,
  degree,
})

describe('findCycles', () => {
  it('无环图返回空数组', () => {
    expect(findCycles(['a', 'b'], [edge('a', 'b')])).toEqual([])
  })

  it('能找出 A→B→A 的环', () => {
    const cycles = findCycles(['a', 'b'], [edge('a', 'b'), edge('b', 'a')])
    expect(cycles).toHaveLength(1)
    expect(new Set(cycles[0])).toEqual(new Set(['a', 'b']))
  })

  it('能找出自环', () => {
    expect(findCycles(['a'], [edge('a', 'a')])).toEqual([['a']])
  })

  it('多环与不连通图都能覆盖', () => {
    const cycles = findCycles(
      ['a', 'b', 'c', 'd'],
      [edge('a', 'b'), edge('b', 'a'), edge('c', 'd'), edge('d', 'c')],
    )
    expect(cycles).toHaveLength(2)
  })
})

describe('统计函数', () => {
  const model: GraphModel = {
    nodes: [node('a', 1), node('b', 1), node('c', 0)],
    edges: [edge('a', 'b')],
    cycles: [],
    parseErrors: [],
  }

  it('graphStats 统计文件数/边数/平均度数', () => {
    const s = graphStats(model)
    expect(s.files).toBe(3)
    expect(s.edges).toBe(1)
    expect(s.avgDegree).toBe(Number(((2 * 1) / 3).toFixed(2)))
  })

  it('orphanNodes 只返回度数为 0 的节点', () => {
    expect(orphanNodes(model.nodes).map((n) => n.id)).toEqual(['c'])
  })

  it('hubNodes 按度数降序并支持 count 边界', () => {
    const nodes = [node('x', 1), node('y', 5), node('z', 3)]
    expect(hubNodes(nodes, 2).map((n) => n.id)).toEqual(['y', 'z'])
    expect(hubNodes(nodes, 0)).toEqual([])
    expect(hubNodes(nodes, 99)).toHaveLength(3)
  })

  it('maxDegree 返回最大度数，空数组为 0', () => {
    expect(maxDegree(model.nodes)).toBe(1)
    expect(maxDegree([])).toBe(0)
  })

  it('connectedComponents 忽略方向分组', () => {
    const groups = connectedComponents(model)
    expect(groups.map((g) => g.sort())).toEqual([['a', 'b'], ['c']])
  })
})

describe('hashString', () => {
  it('相同输入稳定，不同输入大概率不同', () => {
    expect(hashString('src/a.ts')).toBe(hashString('src/a.ts'))
    expect(hashString('src/a.ts')).not.toBe(hashString('src/b.ts'))
  })
})
