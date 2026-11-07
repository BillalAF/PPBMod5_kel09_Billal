import { useState, useEffect, lazy, Suspense } from 'react'
import { Loader } from 'lucide-react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import GUNS_LOCAL from './data/guns.js'
import './App.css'

// ---------------------------------------------------------------------------
// Lazy Loading: Route/Page-level Code Splitting
// Chunks are loaded on-demand when the user navigates to the view.
// ---------------------------------------------------------------------------
const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetail = lazy(() => import('./components/gun/GunDetail.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))

/**
 * Fallback placeholder displayed while a lazy chunk is downloading.
 */
function PageFallback() {
  return (
    <div
      className="state-box"
      style={{
        minHeight: '40vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Loader size={30} className="spin" />
      <p style={{ marginTop: '0.75rem', color: 'var(--brass)' }}>Loading view…</p>
    </div>
  )
}

function getInitialShareLinkState() {
  if (typeof window === 'undefined') return { gun: null, isDeepLinked: false }
  const params = new URLSearchParams(window.location.search)
  const gunParam = params.get('gun')
  if (!gunParam) return { gun: null, isDeepLinked: false }

  const localMatch = GUNS_LOCAL.find(
    (g, i) =>
      String(g.id || `local-${i}`) === gunParam ||
      g.name.toLowerCase() === gunParam.toLowerCase(),
  )
  return {
    gun: localMatch ? { ...localMatch, id: localMatch.id || `local-${gunParam}` } : null,
    isDeepLinked: true,
    gunParam,
  }
}

function App() {
  const initialShare = getInitialShareLinkState()
  const [showSplash, setShowSplash] = useState(!initialShare.isDeepLinked)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState(initialShare.isDeepLinked ? 'detail' : 'list')
  const [selectedGun, setSelectedGun] = useState(initialShare.gun)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ---------------------------------------------------------------------------
  // ShareLink Deep-Linking: Revalidate gun data from API asynchronously
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gunParam = params.get('gun')
    if (!gunParam) return

    // Fetch from API to get fresh record if server has it
    gunService
      .getGunById(gunParam)
      .then((res) => {
        if (res && res.data) {
          setSelectedGun(res.data)
          setMode('detail')
        }
      })
      .catch(() => {
        // Fallback or local data already used
      })
  }, [])

  // Sync browser back/forward buttons with URL state
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const gunParam = params.get('gun')
      if (gunParam) {
        const localMatch = GUNS_LOCAL.find(
          (g, i) =>
            String(g.id || `local-${i}`) === gunParam ||
            g.name.toLowerCase() === gunParam.toLowerCase(),
        )
        if (localMatch) setSelectedGun(localMatch)
        setMode('detail')
      } else {
        setMode('list')
        setSelectedGun(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Unified navigation handler with URL synchronization
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')

      // Sync URL with current piece for shareability
      const gunIdentifier = payload?.id || payload?.name
      if (gunIdentifier) {
        const url = new URL(window.location)
        url.searchParams.set('gun', gunIdentifier)
        window.history.pushState({ gun: gunIdentifier }, '', url)
      }

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)

      // Clear ?gun= query param
      const url = new URL(window.location)
      if (url.searchParams.has('gun')) {
        url.searchParams.delete('gun')
        window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''))
      }

      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)

    // Clear ?gun= query param
    const url = new URL(window.location)
    if (url.searchParams.has('gun')) {
      url.searchParams.delete('gun')
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''))
    }
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        <Suspense fallback={<PageFallback />}>
          {/* Sub-page views */}
          {mode === 'create' && (
            <CreateGunPage
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'detail' && selectedGun && (
            <GunDetail
              gun={selectedGun}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={(g) => setDeleteTarget(g)}
            />
          )}

          {/* Top-level Tabs */}
          {mode === 'list' && (
            <>
              {tab === 'Catalog' && (
                <Catalog
                  onNavigate={(destination, payload) => handleNavigate(destination, payload)}
                />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => setTab('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage onReplaySplash={() => setShowSplash(true)} />
              )}
              {tab === 'About' && <About />}
              {tab === 'Contact' && <Contact />}
            </>
          )}
        </Suspense>
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Hardware Record"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await gunService.deleteGun(deleteTarget.id)
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to delete record.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
