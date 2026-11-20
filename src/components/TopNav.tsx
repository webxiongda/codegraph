import { useApp } from '../appContext'
import { NAV_ITEMS } from '../routes'

export function TopNav() {
  const { route, navigate, model } = useApp()

  return (
    <header className="topnav">
      <button type="button" className="topnav-brand" onClick={() => navigate('graph')} aria-label="返回图谱工作台">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="5" r="3" />
          <circle cx="6" cy="24" r="3" />
          <circle cx="26" cy="24" r="3" />
          <path d="M16 8 L8 21 M16 8 L24 21 M9 24 L23 24" />
        </svg>
        <span>CodeGraph</span>
      </button>
      <nav className="topnav-links" aria-label="主导航">
        {NAV_ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`nav-link${route === item.id ? ' is-active' : ''}`}
            onClick={() => navigate(item.id)}
            aria-current={route === item.id ? 'page' : undefined}
            title={item.blurb}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </nav>
      <div className="topnav-meta">
        <span className="meta-dot" />
        {model.nodes.length} 文件 · {model.edges.length} 边
      </div>
    </header>
  )
}
