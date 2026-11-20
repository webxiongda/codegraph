/** localStorage 读写统一入口：解析失败或存储不可用时安全降级，不污染页面状态 */
const PREFIX = 'codegraph:'

export const STORAGE_KEYS = {
  settings: `${PREFIX}settings`,
  history: `${PREFIX}history`,
  projects: `${PREFIX}projects`,
} as const

export function loadJSON<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || (isValid && !isValid(parsed))) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

export function saveJSON<T>(key: string, value: T): T {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 隐私模式或配额耗尽时仅保留本次会话的内存状态
  }
  return value
}

