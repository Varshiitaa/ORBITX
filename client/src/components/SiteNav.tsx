import { Link, useLocation } from 'react-router-dom'

export const SITE_NAV = [
  { to: '/', label: 'Space Intelligence', match: 'exact' as const },
  { to: '/explore', label: 'Solar System Explorer', match: 'exact' as const },
  { to: '/explore/earth', label: 'Planet Explorer', match: 'planet' as const },
  { to: '/analysis', label: 'Orbital Analysis', match: 'prefix' as const },
  { to: '/app/nasa', label: 'NASA Data Explorer', match: 'prefix' as const },
  { to: '/app', label: 'Mission Planner', match: 'planner' as const },
  { to: '/app/simulation', label: '3D Mission Simulation', match: 'prefix' as const },
  { to: '/app/games', label: 'Space Games', match: 'prefix' as const },
  { to: '/app/report', label: 'Mission Reports', match: 'prefix' as const },
]

function active(pathname: string, item: (typeof SITE_NAV)[number]) {
  if (item.match === 'exact') return pathname === item.to
  if (item.match === 'planet') return pathname.startsWith('/explore/')
  if (item.match === 'planner') return pathname === '/app' || pathname.startsWith('/app/missions') || pathname.startsWith('/app/objectives') || pathname.startsWith('/app/spacecraft') || pathname.startsWith('/app/instruments') || pathname.startsWith('/app/launch') || pathname.startsWith('/app/resources')
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

export function SiteNav({ stacked = false }: { stacked?: boolean }) {
  const { pathname } = useLocation()
  return (
    <nav className={stacked ? 'space-y-0.5' : 'flex gap-1 overflow-x-auto px-4 pb-3 md:px-8'} aria-label="Primary">
      {SITE_NAV.map((item) => {
        const on = active(pathname, item)
        return (
          <Link
            key={item.label}
            to={item.to}
            aria-current={on ? 'page' : undefined}
            className={
              stacked
                ? `block rounded-xl px-3 py-2 text-sm ${on ? 'bg-space-800 text-ink' : 'text-mute hover:bg-space-900 hover:text-ink'}`
                : `shrink-0 rounded-full px-3 py-1.5 text-xs tracking-wide ${on ? 'bg-ink text-space-950' : 'text-mute hover:text-ink'}`
            }
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
