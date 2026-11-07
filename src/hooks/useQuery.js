import { useState, useEffect, useCallback, useRef } from 'react'
import { queryCache, serializeKey } from '../utils/queryCache'

/**
 * useQuery — Reactive React hook with Stale-While-Revalidate (SWR) caching.
 *
 * @param {Object} options
 * @param {Array|string} options.queryKey  — Deterministic key identifying this query.
 * @param {Function}     options.queryFn   — Async function returning data.
 * @param {number}       [options.staleTime=300000] — Freshness window (ms). Default 5m.
 * @param {boolean}      [options.enabled=true] — Whether query should run automatically.
 * @param {*}            [options.initialData=null] — Fallback data before first resolution.
 *
 * @returns {{
 *   data: any,
 *   loading: boolean,
 *   error: string|null,
 *   isStale: boolean,
 *   refetch: () => Promise<any>,
 *   setData: (newData: any) => void
 * }}
 */
export function useQuery({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000,
  enabled = true,
  initialData = null,
}) {
  const queryKeyStr = serializeKey(queryKey)
  const cached = queryCache.get(queryKey)

  // Initialize state directly from cache if available (instant render, zero loading flash!)
  const [data, setData] = useState(() => (cached ? cached.data : initialData))
  const [loading, setLoading] = useState(() => (!cached && enabled))
  const [error, setError] = useState(null)
  const [isStale, setIsStale] = useState(() => (cached ? cached.isStale : true))

  // Keep latest queryFn in ref to avoid stale closures and unnecessary re-triggers
  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  const executeFetch = useCallback(
    async (force = false) => {
      if (!enabled) return

      const currentCache = queryCache.get(queryKey)
      if (!currentCache || force) {
        setLoading(true)
      }

      try {
        setError(null)
        const result = await queryCache.fetch(
          queryKey,
          () => queryFnRef.current(),
          { staleTime, force },
        )
        setData(result)
        setIsStale(false)
        return result
      } catch (err) {
        const errorMsg =
          typeof err?.message === 'string'
            ? err.message
            : typeof err === 'string'
            ? err
            : 'An error occurred while fetching query data.'
        setError(errorMsg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKeyStr, enabled, staleTime],
  )

  useEffect(() => {
    if (!enabled) return

    let isMounted = true
    const current = queryCache.get(queryKey)

    if (!current || current.isStale) {
      executeFetch(false).catch(() => {})
    } else {
      setData(current.data)
      setIsStale(false)
      setLoading(false)
    }

    // Subscribe to queryCache events (updates from other components or invalidations)
    const unsubscribe = queryCache.subscribe(queryKey, (entry, isInvalidated) => {
      if (!isMounted) return

      if (entry) {
        setData(entry.data)
        setIsStale(Boolean(entry.isStale || isInvalidated))
      }
      if (isInvalidated) {
        executeFetch(true).catch(() => {})
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [queryKeyStr, enabled, executeFetch, queryKey])

  const refetch = useCallback(() => executeFetch(true), [executeFetch])

  const setManualData = useCallback(
    (newData) => {
      queryCache.set(queryKey, newData, { staleTime })
      setData(newData)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKeyStr, staleTime],
  )

  return {
    data,
    loading,
    error,
    isStale,
    refetch,
    setData: setManualData,
  }
}

