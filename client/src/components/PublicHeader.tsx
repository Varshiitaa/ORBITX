import { Link } from 'react-router-dom'
import { SiteNav } from './SiteNav'

export function PublicHeader() {
  return (
    <header className="border-b border-line">
      <div className="flex h-16 items-center justify-between px-5 md:px-10">
        <div>
          <Link to="/" className="font-display text-lg tracking-[0.2em]">
            ORBITX
          </Link>
          <p className="text-[10px] uppercase tracking-[0.16em] text-faint">Beyond Earth. Into the unknown.</p>
        </div>
        <Link to="/explore" className="rounded-full border border-line px-4 py-2 text-sm text-ink">
          Explore
        </Link>
      </div>
      <SiteNav />
    </header>
  )
}
