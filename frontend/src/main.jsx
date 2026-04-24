import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const isAdmin = window.location.pathname.startsWith('/admin')

document.title = isAdmin ? 'COIN2GAME Admin' : 'COIN2GAME — игровые пополнения'

if (isAdmin) {
  const link = document.querySelector('link[rel="icon"]') || document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/svg+xml'
  link.href = '/favicon-admin.svg'
  document.head.appendChild(link)
}

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
