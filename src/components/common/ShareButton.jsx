import { useState, useCallback } from 'react'
import { Share2, Check } from 'lucide-react'

/**
 * ShareButton — Allows users to share direct links to any hardware piece.
 *
 * Utilises the Web Share API (native sheet on iOS / Android) with an automatic
 * fallback to clipboard copying on desktop or unsupported browsers.
 *
 * @param {Object} props
 * @param {Object} props.gun         — product hardware data
 * @param {'card'|'detail'|'icon'} [props.variant='card'] — visual layout
 * @param {string} [props.className] — additional CSS class names
 * @param {Function} [props.onShare] — optional callback invoked after sharing
 */
export default function ShareButton({
  gun,
  variant = 'card',
  className = '',
  onShare,
}) {
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(
    async (e) => {
      e.stopPropagation() // Prevent triggering card selection click

      if (!gun) return

      // Construct canonical direct deep-link
      const identifier = gun.id || gun.name
      const shareUrl = `${window.location.origin}${window.location.pathname}?gun=${encodeURIComponent(identifier)}`

      const shareData = {
        title: `${gun.name} | Bore & Barrel`,
        text: `Explore ${gun.name} (${gun.type || gun.category || 'Hardware'}) at Bore & Barrel Armory.`,
        url: shareUrl,
      }

      let sharedNatively = false

      // 1. Try modern Web Share API (mobile devices, iOS Safari, Android Chrome)
      if (
        typeof navigator !== 'undefined' &&
        navigator.share &&
        (!navigator.canShare || navigator.canShare(shareData))
      ) {
        try {
          await navigator.share(shareData)
          sharedNatively = true
          setCopied(true)
          setTimeout(() => setCopied(false), 2200)
          if (onShare) onShare({ success: true, method: 'native', url: shareUrl })
          return
        } catch (err) {
          // If user dismissed the native dialog, gracefully return without error
          if (err.name === 'AbortError') return
          // Otherwise continue to clipboard fallback
        }
      }

      // 2. Clipboard fallback (desktop browsers or when Web Share API is unavailable)
      if (!sharedNatively) {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl)
          } else {
            // Legacy textarea fallback
            const textArea = document.createElement('textarea')
            textArea.value = shareUrl
            textArea.style.position = 'fixed'
            textArea.style.opacity = '0'
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
          }

          setCopied(true)
          setTimeout(() => setCopied(false), 2200)
          if (onShare) onShare({ success: true, method: 'clipboard', url: shareUrl })
        } catch {
          window.prompt('Copy hardware link:', shareUrl)
        }
      }
    },
    [gun, onShare],
  )

  // Full button for Product Detail view
  if (variant === 'detail') {
    return (
      <button
        type="button"
        className={`btn btn--outline ${copied ? 'btn--copied' : ''} ${className}`.trim()}
        onClick={handleShare}
        aria-label={`Share link for ${gun.name}`}
        title="Share link"
      >
        {copied ? (
          <>
            <Check size={16} stroke="#27ae60" /> Link Copied!
          </>
        ) : (
          <>
            <Share2 size={16} /> Share Link
          </>
        )}
      </button>
    )
  }

  // Circular icon button for Catalog cards
  return (
    <button
      type="button"
      className={`share-btn ${copied ? 'share-btn--copied' : ''} ${className}`.trim()}
      onClick={handleShare}
      aria-label={`Share link for ${gun.name}`}
      title={copied ? 'Link copied!' : `Share ${gun.name}`}
    >
      {copied ? (
        <>
          <Check size={16} stroke="#27ae60" />
          <span className="share-tooltip">Copied!</span>
        </>
      ) : (
        <Share2 size={16} />
      )}
    </button>
  )
}

