import axios from 'axios'

// ---------------------------------------------------------------------------
// Base URL & Supabase Key Configuration
// Read from environment variables (.env) with safe fallback for deployment
// ---------------------------------------------------------------------------
const DEFAULT_SUPABASE_URL = 'https://wwgpbxocdudbwmnwsnzw.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_e9rnd5IVRbdW3URgY4u7lw_K1Zgl_lL'

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || DEFAULT_SUPABASE_URL

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_KEY

const IS_SUPABASE =
  BASE_URL.includes('supabase.co') || Boolean(SUPABASE_KEY)

if (import.meta.env.DEV) {
  if (IS_SUPABASE) {
    console.log(
      `%c[Database] Supabase Configured: ${BASE_URL}`,
      'color: #10b981; font-weight: bold; font-size: 12px;',
    )
  } else {
    console.log(
      `%c[Database] API Server Configured: ${BASE_URL}`,
      'color: #3b82f6; font-weight: bold; font-size: 12px;',
    )
  }
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
})

// ---------------------------------------------------------------------------
// Request interceptor — attach Supabase headers (apikey & Bearer auth)
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config) => {
    if (IS_SUPABASE && SUPABASE_KEY) {
      config.headers['apikey'] = SUPABASE_KEY
      if (!config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${SUPABASE_KEY}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ---------------------------------------------------------------------------
// Response interceptor — unwrap response and normalise errors to primitive strings
// Prevents React Error #31 (attempting to render object as a React child)
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = 'An unexpected error occurred'
    let status = null

    if (error.response) {
      status = error.response.status
      const respData = error.response.data

      if (typeof respData === 'string') {
        message = respData
      } else if (respData && typeof respData === 'object') {
        if (typeof respData.message === 'string') {
          message = respData.message
        } else if (typeof respData.msg === 'string') {
          message = respData.msg
        } else if (typeof respData.error === 'string') {
          message = respData.error
        } else if (respData.error && typeof respData.error.message === 'string') {
          message = respData.error.message
        } else if (typeof respData.error_description === 'string') {
          message = respData.error_description
        } else {
          message = `Server error (${status})`
        }
      }
    } else if (error.request) {
      message =
        'Unable to reach the server. Check your connection and try again.'
    } else if (typeof error.message === 'string') {
      message = error.message
    }

    const errObj = new Error(typeof message === 'string' ? message : `Request failed (${status || 500})`)
    errObj.status = status
    errObj.code = error.response?.data?.code
    errObj.raw = error.response?.data

    return Promise.reject(errObj)
  },
)

export { apiClient, BASE_URL, SUPABASE_KEY, IS_SUPABASE }
