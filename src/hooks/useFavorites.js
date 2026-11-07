import { useState } from 'react'
import { useQuery } from './useQuery'
import { queryCache } from '../utils/queryCache'
import favoriteService from '../services/favoriteService'
import { getUserIdentifier } from '../services/userService'

// ---------------------------------------------------------------------------
// localStorage fallback — used when the backend is unavailable so that
// favourites are still fully functional offline.
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'bore_barrel_favorites'

const readLocalFavs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids))
  } catch {
    /* quota exceeded — silently fail */
  }
}

/**
 * Invalidate cached favorites queries across the app.
 */
export function invalidateFavoritesCache() {
  queryCache.invalidate('favorites')
}

// ---------------------------------------------------------------------------
// useFavorites — list all favourited product IDs with Query Caching.
//
// Prevents duplicate queries when multiple GunCards mount simultaneously.
// ---------------------------------------------------------------------------

export function useFavorites() {
  const userIdentifier = getUserIdentifier()

  const { data, loading, error, isStale, refetch } = useQuery({
    queryKey: ['favorites', userIdentifier],
    queryFn: async () => {
      try {
        const response = await favoriteService.getFavorites(userIdentifier)
        if (response && response.success) {
          return { list: response.data || [], isLocal: false }
        }
        throw new Error(response?.message || 'Failed to fetch favorites')
      } catch {
        return { list: readLocalFavs(), isLocal: true }
      }
    },
    staleTime: 60 * 1000, // 1 minute
  })

  return {
    favorites: data?.list || [],
    isLocal: Boolean(data?.isLocal),
    loading,
    error,
    isStale,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useToggleFavorite — toggle a product in/out of favourites.
// Invalidates the favorites cache to automatically notify all subscribers.
// ---------------------------------------------------------------------------

export function useToggleFavorite() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const userIdentifier = getUserIdentifier()

  const toggleFavorite = async (gunId) => {
    try {
      setLoading(true)
      setError(null)

      const response = await favoriteService.toggleFavorite({
        recipe_id: gunId,
        user_identifier: userIdentifier,
      })

      if (response && response.success) {
        queryCache.invalidate(['favorites', userIdentifier])
        return response.data
      }
      throw new Error(response?.message || 'Failed to toggle favorite')
    } catch {
      // Fallback: toggle in localStorage
      const current = readLocalFavs()
      const idx = current.findIndex((id) => String(id) === String(gunId))
      let isFavorited

      if (idx === -1) {
        current.push(gunId)
        isFavorited = true
      } else {
        current.splice(idx, 1)
        isFavorited = false
      }
      writeLocalFavs(current)
      queryCache.invalidate(['favorites', userIdentifier])
      return { is_favorited: isFavorited }
    } finally {
      setLoading(false)
    }
  }

  return { toggleFavorite, loading, error }
}

// ---------------------------------------------------------------------------
// useIsFavorited — convenience wrapper for a single product.
// ---------------------------------------------------------------------------

export function useIsFavorited(gunId) {
  const { favorites, loading: fetchLoading } = useFavorites()
  const { toggleFavorite: toggle, loading: toggleLoading } = useToggleFavorite()

  // Check both server-format (objects with .id) and local-format (plain ids)
  const isFavorited = favorites.some((fav) => {
    const favId = typeof fav === 'object' && fav !== null ? (fav.id ?? fav.product_id ?? fav.recipe_id) : fav
    return String(favId) === String(gunId)
  })

  const toggleFavorite = async () => {
    return toggle(gunId)
  }

  return {
    isFavorited,
    loading: fetchLoading || toggleLoading,
    toggleFavorite,
  }
}

export { getUserIdentifier }
