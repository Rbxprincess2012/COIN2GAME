import { API_BASE } from '../config.js'

const TOKEN_KEY = 'admin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function req(method, path, body) {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const text = await res.text()
    throw new Error(`Сервер вернул не JSON (${res.status}): ${text.slice(0, 200)}`)
  }
  return res.json()
}

export const adminApi = {
  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return req('GET', `/products${q ? '?' + q : ''}`)
  },
  getGroups: () => req('GET', '/products/groups'),
  getRegions: () => req('GET', '/products/regions'),
  updateProduct: (id, data) => req('PUT', `/products/${id}`, data),
  deleteProduct: (id) => req('DELETE', `/products/${id}`),
  syncProducts: () => req('POST', '/products/sync'),
  syncGames: () => req('POST', '/games/sync'),
  syncAll: async () => {
    const [products, games] = await Promise.all([
      req('POST', '/products/sync'),
      req('POST', '/games/sync'),
    ])
    const wb = await req('POST', '/wb/sync-prices')
    return { products, games, wb }
  },
  pauseProducts: (ids, paused) => req('POST', '/products/pause', { ids, paused }),

  // Settings
  getSettings: () => req('GET', '/settings'),
  updateSettings: (data) => req('PUT', '/settings', data),

  // Wildberries
  syncWbCommissions: () => req('POST', '/wb/sync-commissions'),
  syncWbArticles: () => req('POST', '/wb/sync-articles'),
  syncWbPrices: () => req('POST', '/wb/sync-prices'),
  downloadWbTemplate: async () => {
    const res = await fetch(`${API_BASE}/api/admin/wb/export-template`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) {
      let msg = `Ошибка ${res.status}`
      try { msg = (await res.json()).error || msg } catch { msg = (await res.text().catch(() => msg)).slice(0, 200) }
      throw new Error(msg)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'WB_Татьяна.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  },

  // ForeignPay
  getFpBalance: () => req('GET', '/fp/balance'),

  // Logs
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return req('GET', `/logs${q ? '?' + q : ''}`)
  },
}
