import React from 'react'

export default class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: '#0f172a',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '36px' }}>⚠️</div>
          <h3
            style={{
              color: '#f8fafc',
              margin: 0,
              fontSize: '20px',
              fontWeight: 500,
            }}
          >
            Something went wrong
          </h3>
          <p
            style={{
              color: '#94a3b8',
              margin: 0,
              maxWidth: '320px',
              lineHeight: 1.6,
            }}
          >
            We hit an unexpected error. Please refresh the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#1d4ed8',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Refresh page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

