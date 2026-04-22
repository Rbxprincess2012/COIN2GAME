import { API_BASE } from './config.js'

async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiGet(path, params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}${path}${q ? '?' + q : ''}`)
  return res.json()
}

export const api = {
  // Публичный конфиг (cp_public_id и т.д.)
  getConfig: () => apiGet('/api/config'),

  // CloudPayments: верификация + доставка товара
  cpComplete: (body) => apiPost('/api/cp/complete', body),

  // 1.1 Все продукты (с типами TOPUP/VOUCHER)
  fpProducts: (params = {}) => apiGet('/api/fp/products', params),

  // 2. Группы платформ
  fpGroups: (params = {}) => apiGet('/api/fp/groups', params),

  // 3. Форма группы — поля для TOPUP, продукты для VOUCHER
  fpGroupForm: (group) => apiGet('/api/fp/group-form', { group }),

  // 4.2 Купить ваучер → возвращает { status, sbp_uuid, sbp_url, qr_url, product, ... }
  buyVoucher: (body) => apiPost('/api/fp/voucher/buy', body),

  // 4.3 Пополнить аккаунт TOPUP → возвращает { status, sbp_uuid, sbp_url, qr_url, product, ... }
  buyTopup: (body) => apiPost('/api/fp/topup/buy', body),

  // 5. Статус транзакции эквайринга по sbp_uuid
  txStatus: (sbp_uuid) => apiPost('/api/fp/transaction/status', { sbp_uuid }),

  // 5.1 Данные купленного товара (код/ваучер/ссылка) по sbp_uuid
  productInfo: (sbp_uuid) => apiPost('/api/fp/product/info', { sbp_uuid }),
}
