import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const errorMsg =
        typeof this.state.error === 'object'
          ? this.state.error?.message || JSON.stringify(this.state.error)
          : String(this.state.error || 'An unexpected error occurred')

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'var(--bg, #f2f4f5)',
            color: 'var(--text, #1c242c)',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              padding: '32px',
              background: '#fff',
              border: '1px solid var(--line, #d8dee4)',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            }}
          >
            <AlertCircle size={40} color="#e74c3c" style={{ marginBottom: '16px' }} />
            <h2 style={{ margin: '0 0 12px 0', fontSize: '1.4rem' }}>Something went wrong</h2>
            <p style={{ color: '#6b7280', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.5 }}>
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'var(--brass, #c69214)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={16} /> Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

