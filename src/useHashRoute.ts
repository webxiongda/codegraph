import { useCallback, useEffect, useState } from 'react'
import { parseRouteHash, type RouteId } from './routes'

/** 零依赖 hash 路由：适合嵌在门户 iframe 中使用相对路径访问 */
export function useHashRoute(): [RouteId, (route: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(() => parseRouteHash(window.location.hash))

  useEffect(() => {
    const sync = (): void => setRoute(parseRouteHash(window.location.hash))
    window.addEventListener('hashchange', sync)
    if (!window.location.hash) window.location.hash = '#/graph'
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const navigate = useCallback((next: RouteId): void => {
    if (parseRouteHash(window.location.hash) !== next) {
      window.location.hash = `#/${next}`
    } else {
      setRoute(next)
    }
  }, [])

  return [route, navigate]
}
