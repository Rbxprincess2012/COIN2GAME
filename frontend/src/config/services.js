const SI = 'https://cdn.simpleicons.org'

export const SERVICE_CONFIG = {
  'APPLE ID': {
    label: 'Apple ID',
    logo: `${SI}/apple/a2aaad`,
    accent: '#a2aaad',
    bg: 'linear-gradient(135deg, #1a1a1c 0%, #28282c 100%)',
  },
  'Nintendo': {
    label: 'Nintendo',
    logo: `${SI}/nintendo/e4000f`,
    accent: '#e4000f',
    bg: 'linear-gradient(135deg, #1a0002 0%, #300005 100%)',
  },
  'Playstation': {
    label: 'PlayStation',
    logo: `${SI}/playstation/0070d1`,
    accent: '#0070d1',
    bg: 'linear-gradient(135deg, #00101e 0%, #001f3d 100%)',
  },
  'Xbox': {
    label: 'Xbox',
    logo: `${SI}/xbox/52b043`,
    accent: '#52b043',
    bg: 'linear-gradient(135deg, #061206 0%, #0f2210 100%)',
  },
  'Steam': {
    label: 'Steam',
    logo: `${SI}/steam/66c0f4`,
    accent: '#66c0f4',
    bg: 'linear-gradient(135deg, #0d1824 0%, #1b2838 100%)',
  },
  'Valorant': {
    label: 'Valorant',
    logo: `${SI}/valorant/ff4655`,
    accent: '#ff4655',
    bg: 'linear-gradient(135deg, #0e0008 0%, #1c0012 100%)',
  },
  'PUBG Mobile': {
    label: 'PUBG Mobile',
    logo: `${SI}/pubg/f2a900`,
    accent: '#f2a900',
    bg: 'linear-gradient(135deg, #181000 0%, #281c00 100%)',
  },
  'PUBG Battleground': {
    label: 'PUBG PC',
    logo: `${SI}/pubg/c8a95a`,
    accent: '#c8a95a',
    bg: 'linear-gradient(135deg, #181208 0%, #261e0e 100%)',
  },
  'Razer Gold': {
    label: 'Razer Gold',
    logo: `${SI}/razer/44d62c`,
    accent: '#44d62c',
    bg: 'linear-gradient(135deg, #001200 0%, #002600 100%)',
  },
}

// ISO 3166-1 alpha-2 codes for flagcdn.com
export const REGION_FLAG_CODE = {
  'Россия': 'ru', 'RU': 'ru', 'Russia': 'ru',
  'США': 'us', 'US': 'us', 'USA': 'us',
  'ОАЭ': 'ae', 'AE': 'ae', 'UAE': 'ae',
  'Польша': 'pl', 'PL': 'pl', 'Poland': 'pl',
  'Турция': 'tr', 'TR': 'tr', 'Turkey': 'tr',
  'Япония': 'jp', 'JP': 'jp', 'Japan': 'jp',
  'Бразилия': 'br', 'BR': 'br', 'Brazil': 'br',
  'Великобритания': 'gb', 'GB': 'gb', 'UK': 'gb',
  'Гонконг': 'hk', 'HK': 'hk',
  'ЮАР': 'za', 'ZA': 'za',
  'Европа': 'eu', 'EU': 'eu', 'Europe': 'eu',
  'Германия': 'de', 'DE': 'de', 'Germany': 'de',
  'Франция': 'fr', 'FR': 'fr', 'France': 'fr',
  'Казахстан': 'kz', 'KZ': 'kz',
  'Украина': 'ua', 'UA': 'ua',
  'Аргентина': 'ar', 'AR': 'ar', 'Argentina': 'ar',
  'Индия': 'in', 'IN': 'in', 'India': 'in',
  'Китай': 'cn', 'CN': 'cn', 'China': 'cn',
  'Канада': 'ca', 'CA': 'ca', 'Canada': 'ca',
  'Австралия': 'au', 'AU': 'au', 'Australia': 'au',
  'Мексика': 'mx', 'MX': 'mx', 'Mexico': 'mx',
  'Саудовская Аравия': 'sa', 'SA': 'sa',
  'Израиль': 'il', 'IL': 'il',
  'Индонезия': 'id', 'ID': 'id',
  'Малайзия': 'my', 'MY': 'my',
  'Чехия': 'cz', 'CZ': 'cz',
  'Новая Зеландия': 'nz', 'NZ': 'nz',
  'Венгрия': 'hu', 'HU': 'hu',
  'Кувейт': 'kw', 'KW': 'kw',
  'Бахрейн': 'bh', 'BH': 'bh',
  'Словакия': 'sk', 'SK': 'sk',
  'Румыния': 'ro', 'RO': 'ro',
  'Ливан': 'lb', 'LB': 'lb',
  'Хорватия': 'hr', 'HR': 'hr',
  'Австрия': 'at', 'AT': 'at',
  'Люксембург': 'lu', 'LU': 'lu',
  'Италия': 'it', 'IT': 'it',
  'Сингапур': 'sg', 'SG': 'sg',
  'Ирландия': 'ie', 'IE': 'ie',
  'Финляндия': 'fi', 'FI': 'fi',
  'Бельгия': 'be', 'BE': 'be',
  'Португалия': 'pt', 'PT': 'pt',
  'Испания': 'es', 'ES': 'es',
  'Таиланд': 'th', 'TH': 'th',
  'Греция': 'gr', 'GR': 'gr',
  'Нидерланды': 'nl', 'NL': 'nl',
  'Катар': 'qa', 'QA': 'qa',
  'Оман': 'om', 'OM': 'om',
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
