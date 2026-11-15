import { useEffect, useState } from 'react'
import { fetchSpaceCatalog, type SpaceCatalog } from '../services/space'

export function useSpaceCatalog(epoch = '') {
  const [catalog, setCatalog] = useState<SpaceCatalog | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchSpaceCatalog(epoch || undefined)
      .then((next) => {
        if (!cancelled) setCatalog(next)
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setCatalog(null)
          setError(reason instanceof Error ? reason.message : 'NASA/JPL Horizons is unavailable.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [epoch])

  return { catalog, error, loading }
}
