import { describe, it, expect } from 'vitest'
import { parseRouteHash } from '../routes'

describe('parseRouteHash', () => {
  it('识别合法路由', () => {
    expect(parseRouteHash('#/cycles')).toBe('cycles')
    expect(parseRouteHash('#/files')).toBe('files')
    expect(parseRouteHash('#graph')).toBe('graph')
  })

  it('容错大小写与尾部斜杠', () => {
    expect(parseRouteHash('#/Files')).toBe('files')
    expect(parseRouteHash('#/cycles/')).toBe('cycles')
  })

  it('空或未知路由回落到 graph', () => {
    expect(parseRouteHash('')).toBe('graph')
    expect(parseRouteHash('#')).toBe('graph')
    expect(parseRouteHash('#/does-not-exist')).toBe('graph')
  })

  it('忽略查询串', () => {
    expect(parseRouteHash('#/metrics?x=1')).toBe('metrics')
  })
})
