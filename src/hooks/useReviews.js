import { useState } from 'react'
import { useQuery } from './useQuery'
import { queryCache } from '../utils/queryCache'
import reviewService from '../services/reviewService'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product with Query Caching.
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const { data, loading, error, refetch } = useQuery({
    queryKey: ['reviews', gunId],
    queryFn: async () => {
      if (!gunId) return []
      const response = await reviewService.getReviews(gunId)
      if (response && response.success) {
        return response.data || []
      }
      throw new Error(response?.message || 'Failed to fetch reviews.')
    },
    enabled: Boolean(gunId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  return {
    reviews: data || [],
    loading,
    error,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review for a product.
// Invalidates review query cache so newly posted reviews appear immediately.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await reviewService.createReview(gunId, reviewData)

      if (response.success) {
        setSuccess(true)
        queryCache.invalidate(['reviews', gunId])
        return response.data
      } else {
        setError(response.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}
