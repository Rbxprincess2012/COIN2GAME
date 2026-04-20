import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const isAdmin = window.location.pathname.startsWith('/admin')

async function mount() {
  const root = ReactDOM.createRoot(document.getElementById('root'))
  if (isAdmin) {
    const { default: AdminApp } = await import('./admin/AdminApp')
    root.render(<React.StrictMode><AdminApp /></React.StrictMode>)
  } else {
    const { default: App } = await import('./App')
    root.render(<React.StrictMode><App /></React.StrictMode>)
  }
}

mount()
