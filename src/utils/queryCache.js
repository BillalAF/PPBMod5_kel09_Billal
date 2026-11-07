/**
 * Query Cache System — In-memory & reactive query caching with Stale-While-Revalidate (SWR).
 *
 * Features:
 *   1. Key-based caching (supports strings, objects, arrays)
 *   2. Request Deduplication (prevents duplicate in-flight network requests)
 *   3. Stale-While-Revalidate (instant data display + background revalidation)
 *   4. Cache Invalidation (automatic UI sync on mutations: create, update, delete)
 *   5. Pub-Sub event model for real-time reactivity across components
 */

/**
 * Deterministically serialise cache keys into a consistent string hash.
 * Handles strings, numbers, arrays, and plain objects (sorted by key).
 */
export function serializeKey(key) {
  if (key == null) return ''
  if (typeof key === 'string' || typeof key === 'number') return String(key)

  if (Array.isArray(key)) {
    return key.map((item) => serializeKey(item)).join('::')
  }

  if (typeof key === 'object') {
    const sorted = Object.keys(key)
      .sort()
      .reduce((acc, k) => {
        if (key[k] !== undefined) {
          acc[k] = key[k]
        }
        return acc
      }, {})
    return JSON.stringify(sorted)
  }

  return JSON.stringify(key)
}

class QueryCache {
  constructor() {
    this.cache = new Map()       // key -> { data, timestamp, staleTime }
    this.inFlight = new Map()    // key -> Promise
    this.listeners = new Map()   // key -> Set<callback>
  }

  /**
   * Read data from cache.
   * Returns { data, timestamp, isStale } or null if not cached.
   */
  get(rawKey) {
    const key = serializeKey(rawKey)
    const entry = this.cache.get(key)
    if (!entry) return null

    const isStale = Date.now() - entry.timestamp > entry.staleTime
    return {
      data: entry.data,
      timestamp: entry.timestamp,
      staleTime: entry.staleTime,
      isStale,
    }
  }

  /**
   * Set cached data and notify all active subscribers.
   */
  set(rawKey, data, options = {}) {
    const key = serializeKey(rawKey)
    const staleTime = options.staleTime ?? 5 * 60 * 1000 // default 5 minutes
    const entry = {
      data,
      timestamp: Date.now(),
      staleTime,
    }
    this.cache.set(key, entry)
    this.notify(key, entry, false)
    return entry
  }

  /**
   * Fetch data with caching and in-flight request deduplication.
   */
  async fetch(rawKey, fetcher, options = {}) {
    const key = serializeKey(rawKey)
    const staleTime = options.staleTime ?? 5 * 60 * 1000
    const force = Boolean(options.force)

    // 1. Fresh Cache Hit
    const existing = this.get(rawKey)
    if (existing && !existing.isStale && !force) {
      if (import.meta.env.DEV) {
        console.debug(`[QueryCache] ⚡ HIT: "${key}" (serving from cache)`)
      }
      return existing.data
    }

    // 2. Request Deduplication: In-flight Promise sharing
    if (this.inFlight.has(key)) {
      if (import.meta.env.DEV) {
        console.debug(`[QueryCache] ⏳ DEDUP: "${key}" (sharing active request)`)
      }
      return this.inFlight.get(key)
    }

    // 3. Network Fetch
    if (import.meta.env.DEV) {
      console.debug(`[QueryCache] 🌐 FETCH: "${key}" (fetching from network)`)
    }

    const promise = (async () => {
      try {
        const result = await fetcher()
        this.set(rawKey, result, { staleTime })
        return result
      } finally {
        this.inFlight.delete(key)
      }
    })()

    this.inFlight.set(key, promise)
    return promise
  }

  /**
   * Invalidate all queries matching a key prefix.
   * Marks them as stale and notifies subscribers to re-fetch.
   */
  invalidate(rawPrefix) {
    const prefix = serializeKey(rawPrefix)
    const matchedKeys = []

    for (const key of this.cache.keys()) {
      if (key === prefix || key.startsWith(`${prefix}::`) || key.startsWith(prefix)) {
        matchedKeys.push(key)
        const entry = this.cache.get(key)
        if (entry) {
          entry.staleTime = 0 // immediately stale
        }
      }
    }

    if (import.meta.env.DEV) {
      console.debug(`[QueryCache] 🔄 INVALIDATE: prefix "${prefix}" (matched: ${matchedKeys.length})`)
    }

    matchedKeys.forEach((key) => {
      const entry = this.cache.get(key)
      this.notify(key, entry, true)
    })
  }

  /**
   * Subscribe to updates for a specific cache key.
   */
  subscribe(rawKey, callback) {
    const key = serializeKey(rawKey)
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    const set = this.listeners.get(key)
    set.add(callback)

    return () => {
      set.delete(callback)
      if (set.size === 0) {
        this.listeners.delete(key)
      }
    }
  }

  /**
   * Notify subscribers of data updates or invalidation.
   */
  notify(key, entry, isInvalidated = false) {
    if (this.listeners.has(key)) {
      for (const cb of this.listeners.get(key)) {
        try {
          cb(entry, isInvalidated)
        } catch (err) {
          console.error('[QueryCache] Listener error:', err)
        }
      }
    }
  }

  /**
   * Clear all cached data and pending requests.
   */
  clear() {
    this.cache.clear()
    this.inFlight.clear()
  }
}

export const queryCache = new QueryCache()

