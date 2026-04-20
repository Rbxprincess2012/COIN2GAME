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
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  return res.json()
}

export const adminApi = {
  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return req('GET', `/products${q ? '?' + q : ''}`)
  },
  getGroups: () => req('GET', '/products/groups'),
  updateProduct: (id, data) => req('PUT', `/products/${id}`, data),
  deleteProduct: (id) => req('DELETE', `/products/${id}`),
  syncProducts: () => req('POST', '/products/sync'),

  // Settings
  getSettings: () => req('GET', '/settings'),
  updateSettings: (data) => req('PUT', '/settings', data),

  // Logs
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return req('GET', `/logs${q ? '?' + q : ''}`)
  },
}
