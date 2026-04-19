export const SERVICE_CONFIG = {
  'APPLE ID': {
    label: 'Apple ID',
    image: 'https://s3.api.foreignpay.ru/products-images/image_APPLE_ID.png',
    accent: '#a2aaad',
    bg: 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)',
  },
  'Nintendo': {
    label: 'Nintendo',
    image: 'https://s3.api.foreignpay.ru/products-images/image_Nintendoeshop.png',
    accent: '#ff4444',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2d0303 100%)',
  },
  'Playstation': {
    label: 'PlayStation',
    image: 'https://s3.api.foreignpay.ru/products-images/image_playstation.png',
    accent: '#0070d1',
    bg: 'linear-gradient(135deg, #001224 0%, #00214a 100%)',
  },
  'PUBG Battleground': {
    label: 'PUBG PC',
    image: 'https://s3.api.foreignpay.ru/products-images/image_pubgBG.png',
    accent: '#c8a95a',
    bg: 'linear-gradient(135deg, #1a1408 0%, #2a2010 100%)',
  },
  'PUBG Mobile': {
    label: 'PUBG Mobile',
    image: 'https://s3.api.foreignpay.ru/products-images/image_pubg.png',
    accent: '#f2a900',
    bg: 'linear-gradient(135deg, #1a1000 0%, #2a1c00 100%)',
  },
  'Razer Gold': {
    label: 'Razer Gold',
    image: 'https://s3.api.foreignpay.ru/products-images/image_RazerGold.png',
    accent: '#44d62c',
    bg: 'linear-gradient(135deg, #001400 0%, #002800 100%)',
  },
  'Steam': {
    label: 'Steam',
    image: 'https://s3.api.foreignpay.ru/products-images/image_steam.png',
    accent: '#66c0f4',
    bg: 'linear-gradient(135deg, #0d1824 0%, #1b2838 100%)',
  },
  'Valorant': {
    label: 'Valorant',
    image: 'https://s3.api.foreignpay.ru/products-images/image_valorant.png',
    accent: '#ff4655',
    bg: 'linear-gradient(135deg, #0d0009 0%, #1a0010 100%)',
  },
  'Xbox': {
    label: 'Xbox',
    image: 'https://s3.api.foreignpay.ru/products-images/image_Xboxgift.png',
    accent: '#52b043',
    bg: 'linear-gradient(135deg, #071407 0%, #0e2410 100%)',
  },
}

// ISO 3166-1 alpha-2 codes for flagcdn.com
export const REGION_FLAG_CODE = {
  'Россия': 'ru',
  'США': 'us',
  'ОАЭ': 'ae',
  'Польша': 'pl',
  'Турция': 'tr',
  'Япония': 'jp',
  'Бразилия': 'br',
  'Великобритания': 'gb',
  'Гонконг': 'hk',
  'ЮАР': 'za',
  'Европа': 'eu',
}

export function getFlagUrl(region) {
  const code = REGION_FLAG_CODE[region]
  return code ? `https://flagcdn.com/w40/${code}.png` : null
}

export const SERVICE_ORDER = [
  'APPLE ID',
  'Nintendo',
  'Playstation',
  'Xbox',
  'Steam',
  'Valorant',
  'PUBG Mobile',
  'PUBG Battleground',
  'Razer Gold',
]
