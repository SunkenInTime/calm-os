import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from './App.tsx'
import QuickAddOverlay from './QuickAddOverlay.tsx'
import './index.css'

type ErrorBoundaryState = {
  hasError: boolean
  message: string
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unknown error' }
  }

  componentDidCatch(error: Error): void {
    console.error('Renderer error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1>Calm OS</h1>
          <p>Renderer crashed: {this.state.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

const convexUrl = import.meta.env.VITE_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null
const mode = new URLSearchParams(window.location.search).get('mode')
const isQuickAddMode = mode === 'quick-add'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {convex ? (
        <ConvexProvider client={convex}>
          {isQuickAddMode ? <QuickAddOverlay /> : <App />}
        </ConvexProvider>
      ) : (
        <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1>Calm OS</h1>
          <p>Convex is not configured. Add VITE_CONVEX_URL to your env and restart.</p>
        </div>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
)

// Use contextBridge
if (window.ipcRenderer?.on) {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
}
