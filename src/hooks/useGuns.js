import { useQuery } from './useQuery'
import { queryCache } from '../utils/queryCache'
import gunService from '../services/gunService'

/**
 * Invalidate cached gun queries across the entire app.
 * Called automatically after create, update, or delete operations.
 */
export function invalidateGunsCache() {
  queryCache.invalidate('guns')
  queryCache.invalidate('gun')
}

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API.
//
// Returns { guns, loading, error, pagination, refetch }.
// Utilises Query Caching to prevent redundant API calls when navigating tabs.
// ---------------------------------------------------------------------------
export function useGuns(params = {}) {
  const { data, loading, error, refetch } = useQuery({
    queryKey: ['guns', params],
    queryFn: async () => {
      const response = await gunService.getGuns(params)
      if (response && response.success !== false) {
        return {
          guns: response.data || [],
          pagination: response.pagination || null,
        }
      }
      throw new Error(response?.message || 'Failed to fetch products.')
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  })

  return {
    guns: data?.guns || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID.
//
// Returns { gun, loading, error, refetch }.
// ---------------------------------------------------------------------------
export function useGunById(id) {
  const { data, loading, error, refetch } = useQuery({
    queryKey: ['gun', id],
    queryFn: async () => {
      if (!id) return null
      const response = await gunService.getGunById(id)
      if (response && response.success !== false) {
        return response.data
      }
      throw new Error(response?.message || 'Product not found.')
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    gun: data || null,
    loading,
    error,
    refetch,
  }
}
