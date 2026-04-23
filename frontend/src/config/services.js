// jsDelivr serves all Simple Icons SVGs (black fill by default)
// colorFilter() converts black → brand color via CSS filter at runtime
const SI = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons'

function logo(slug) {
  return `${SI}/${slug}.svg`
}

// Converts hex color → CSS filter to recolor a black SVG
// Algorithm: brightness(0) turns it pure black, then color filters apply
export function colorFilter(hex) {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  // Normalize
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0, l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
  }

  const hDeg = Math.round(h * 360)
  const sPct = Math.round(s * 100)
  const lPct = Math.round(l * 100)

  // brightness(0) → pure black → sepia(1) → golden → hue-rotate to target hue
  // then saturate and brightness to match target
  const brt = Math.min(200, Math.round(lPct * 2.2 + 10))
  const sat = Math.min(1000, Math.round(sPct * 10 + 200))

  return `brightness(0) saturate(100%) invert(1) sepia(1) saturate(${sat}%) hue-rotate(${hDeg}deg) brightness(${brt}%)`
}

export const SERVICE_CONFIG = {
  // ── Gaming platforms ──────────────────────────────────────────────────────
  'APPLE ID': {
    label: 'Apple ID',
    logo: logo('apple'),
    accent: '#a2aaad',
    bg: 'linear-gradient(135deg, #1a1a1c 0%, #28282c 100%)',
  },
  'Nintendo': {
    label: 'Nintendo',
    logo: logo('nintendo'),
    accent: '#e4000f',
    bg: 'linear-gradient(135deg, #1a0002 0%, #300005 100%)',
  },
  'Playstation': {
    label: 'PlayStation',
    logo: logo('playstation'),
    accent: '#0070d1',
    bg: 'linear-gradient(135deg, #00101e 0%, #001f3d 100%)',
  },
  'Xbox': {
    label: 'Xbox',
    logo: logo('xbox'),
    accent: '#52b043',
    bg: 'linear-gradient(135deg, #061206 0%, #0f2210 100%)',
  },
  'Steam': {
    label: 'Steam',
    logo: logo('steam'),
    accent: '#66c0f4',
    bg: 'linear-gradient(135deg, #0d1824 0%, #1b2838 100%)',
  },
  'Battle.net': {
    label: 'Battle.net',
    logo: logo('activision'),
    accent: '#00aeff',
    bg: 'linear-gradient(135deg, #001020 0%, #00203a 100%)',
  },
  'Valorant': {
    label: 'Valorant',
    logo: logo('valorant'),
    accent: '#ff4655',
    bg: 'linear-gradient(135deg, #0e0008 0%, #1c0012 100%)',
  },
  'PUBG Mobile': {
    label: 'PUBG Mobile',
    logo: logo('pubg'),
    accent: '#f2a900',
    bg: 'linear-gradient(135deg, #181000 0%, #281c00 100%)',
  },
  'PUBG Battleground': {
    label: 'PUBG PC',
    logo: logo('pubg'),
    accent: '#c8a95a',
    bg: 'linear-gradient(135deg, #181208 0%, #261e0e 100%)',
  },
  'Razer Gold': {
    label: 'Razer Gold',
    logo: logo('razer'),
    accent: '#44d62c',
    bg: 'linear-gradient(135deg, #001200 0%, #002600 100%)',
  },
  'Roblox': {
    label: 'Roblox',
    logo: logo('roblox'),
    accent: '#e42b26',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2e0303 100%)',
  },
  'Minecraft': {
    label: 'Minecraft',
    logo: logo('minecraft'),
    accent: '#62b47a',
    bg: 'linear-gradient(135deg, #061410 0%, #0e2418 100%)',
  },
  'Fortnite': {
    label: 'Fortnite',
    logo: logo('fortnite'),
    accent: '#00d0ff',
    bg: 'linear-gradient(135deg, #001a24 0%, #002d3d 100%)',
  },
  'League Of Legends': {
    label: 'League of Legends',
    logo: logo('leagueoflegends'),
    accent: '#c69b3a',
    bg: 'linear-gradient(135deg, #0a0800 0%, #1c1400 100%)',
  },
  'Apex Legends Mobile': {
    label: 'Apex Legends',
    logo: logo('ea'),
    accent: '#da292a',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2e0000 100%)',
  },

  // ── Games (no SI logo — themed gradient) ─────────────────────────────────
  'Genshin Impact': {
    label: 'Genshin Impact',
    accent: '#4fc3f7',
    bg: 'linear-gradient(135deg, #001828 0%, #002a3a 100%)',
  },
  'Honkai Star Rail': {
    label: 'Honkai Star Rail',
    accent: '#a78bfa',
    bg: 'linear-gradient(135deg, #0a0018 0%, #180030 100%)',
  },
  'Free Fire': {
    label: 'Free Fire',
    accent: '#ff6b00',
    bg: 'linear-gradient(135deg, #1a0800 0%, #2e1200 100%)',
  },
  'Mobile Legends': {
    label: 'Mobile Legends',
    accent: '#e53935',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0808 100%)',
  },
  'Mobile Legends GLOBAL': {
    label: 'ML: Bang Bang',
    accent: '#e53935',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0808 100%)',
  },
  'Honor of Kings': {
    label: 'Honor of Kings',
    accent: '#ffd700',
    bg: 'linear-gradient(135deg, #120a00 0%, #241800 100%)',
  },
  'Identity V': {
    label: 'Identity V',
    accent: '#c9a96e',
    bg: 'linear-gradient(135deg, #100800 0%, #201400 100%)',
  },
  'Destiny 2': {
    label: 'Destiny 2',
    accent: '#b0b8c8',
    bg: 'linear-gradient(135deg, #060c18 0%, #0e1828 100%)',
  },
  'Marvel Rivals': {
    label: 'Marvel Rivals',
    accent: '#e62429',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2e0606 100%)',
  },
  'Wuthering Waves': {
    label: 'Wuthering Waves',
    accent: '#4dd0e1',
    bg: 'linear-gradient(135deg, #001820 0%, #002830 100%)',
  },
  'AFK Journey': {
    label: 'AFK Journey',
    accent: '#7c4dff',
    bg: 'linear-gradient(135deg, #0a0020 0%, #180040 100%)',
  },
  'Delta Force': {
    label: 'Delta Force',
    accent: '#78909c',
    bg: 'linear-gradient(135deg, #080e12 0%, #121e24 100%)',
  },
  'Magic Chess Go Go': {
    label: 'Magic Chess',
    accent: '#ab47bc',
    bg: 'linear-gradient(135deg, #100018 0%, #20002e 100%)',
  },
  'Arena Breakout': {
    label: 'Arena Breakout',
    accent: '#ff8f00',
    bg: 'linear-gradient(135deg, #180c00 0%, #281800 100%)',
  },
  'Farlight 84': {
    label: 'Farlight 84',
    accent: '#00e5ff',
    bg: 'linear-gradient(135deg, #001824 0%, #002838 100%)',
  },
  'Dragonheir Silent Gods': {
    label: 'Dragonheir',
    accent: '#ff6f00',
    bg: 'linear-gradient(135deg, #180a00 0%, #2c1200 100%)',
  },
  'Once Human': {
    label: 'Once Human',
    accent: '#80cbc4',
    bg: 'linear-gradient(135deg, #041410 0%, #0a2420 100%)',
  },
  'HELLDIVERS 2': {
    label: 'HELLDIVERS 2',
    accent: '#ffeb3b',
    bg: 'linear-gradient(135deg, #0a0800 0%, #181400 100%)',
  },
  'Goddess of Victory Nikke': {
    label: 'NIKKE',
    accent: '#e040fb',
    bg: 'linear-gradient(135deg, #120018 0%, #200030 100%)',
  },
  'Stumble Guys': {
    label: 'Stumble Guys',
    accent: '#ff6d00',
    bg: 'linear-gradient(135deg, #181000 0%, #281800 100%)',
  },
  'Super SUS': {
    label: 'Super SUS',
    accent: '#9c27b0',
    bg: 'linear-gradient(135deg, #0e0018 0%, #1c002e 100%)',
  },
  'Black Desert': {
    label: 'Black Desert',
    accent: '#bf360c',
    bg: 'linear-gradient(135deg, #180800 0%, #280e00 100%)',
  },
  'Zepeto': {
    label: 'Zepeto',
    accent: '#ff4081',
    bg: 'linear-gradient(135deg, #1a0010 0%, #2c0020 100%)',
  },
  'EVE Echoes': {
    label: 'EVE Echoes',
    accent: '#29b6f6',
    bg: 'linear-gradient(135deg, #001824 0%, #002838 100%)',
  },
  'Likee': {
    label: 'Likee',
    accent: '#ff5252',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0606 100%)',
  },
  'Snowbreak Containment Zone': {
    label: 'Snowbreak',
    accent: '#40c4ff',
    bg: 'linear-gradient(135deg, #001824 0%, #002438 100%)',
  },
  'Love and Deepspace': {
    label: 'Love and Deepspace',
    accent: '#f48fb1',
    bg: 'linear-gradient(135deg, #1a0010 0%, #28001e 100%)',
  },
  'Harry Potter Magic Awakened': {
    label: 'Harry Potter',
    accent: '#c8a95a',
    bg: 'linear-gradient(135deg, #0c0800 0%, #1e1400 100%)',
  },
  'State of Survival Zombie War': {
    label: 'State of Survival',
    accent: '#ef5350',
    bg: 'linear-gradient(135deg, #1a0400 0%, #2c0800 100%)',
  },
  'Watcher Of Realms': {
    label: 'Watcher Of Realms',
    accent: '#7986cb',
    bg: 'linear-gradient(135deg, #060818 0%, #0e1030 100%)',
  },
  'MARVEL Mystic Mayhem': {
    label: 'Marvel Mystic Mayhem',
    accent: '#e62429',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2e0606 100%)',
  },
  'Clair Obscur Expedition 33': {
    label: 'Clair Obscur',
    accent: '#ce93d8',
    bg: 'linear-gradient(135deg, #100018 0%, #1e0028 100%)',
  },
  'LifeAfter': {
    label: 'LifeAfter',
    accent: '#66bb6a',
    bg: 'linear-gradient(135deg, #041008 0%, #0a2010 100%)',
  },
  'New State Mobile': {
    label: 'New State Mobile',
    accent: '#90a4ae',
    bg: 'linear-gradient(135deg, #060c10 0%, #0e1820 100%)',
  },
  'Destiny Rising': {
    label: 'Destiny Rising',
    accent: '#b0b8c8',
    bg: 'linear-gradient(135deg, #060c18 0%, #0e1828 100%)',
  },
  'Sid Meiers Civilization VI': {
    label: 'Civilization VI',
    accent: '#c0392b',
    bg: 'linear-gradient(135deg, #180600 0%, #2c0e00 100%)',
  },
  'LEGO Star Wars': {
    label: 'LEGO Star Wars',
    accent: '#f9d71c',
    bg: 'linear-gradient(135deg, #0e0800 0%, #1e1400 100%)',
  },
  'Onmyoji Arena': {
    label: 'Onmyoji Arena',
    accent: '#ef9a9a',
    bg: 'linear-gradient(135deg, #1a0808 0%, #2c1010 100%)',
  },
  'Top Eleven Be Football Manager': {
    label: 'Top Eleven',
    accent: '#43a047',
    bg: 'linear-gradient(135deg, #041008 0%, #081e10 100%)',
  },
  'Point Blank': {
    label: 'Point Blank',
    accent: '#ef5350',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0606 100%)',
  },
  'Metro Exodus': {
    label: 'Metro Exodus',
    accent: '#a1887f',
    bg: 'linear-gradient(135deg, #100806 0%, #201410 100%)',
  },
  'God of War Ragnarok': {
    label: 'God of War',
    accent: '#b71c1c',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0000 100%)',
  },
  'God of War': {
    label: 'God of War',
    accent: '#b71c1c',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0000 100%)',
  },
  'DOOM The Dark Ages': {
    label: 'DOOM',
    accent: '#e53935',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0000 100%)',
  },
  'Street Fighter 6': {
    label: 'Street Fighter 6',
    accent: '#ff6f00',
    bg: 'linear-gradient(135deg, #180a00 0%, #2c1400 100%)',
  },
  'Mortal Kombat 11': {
    label: 'Mortal Kombat',
    accent: '#c62828',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0000 100%)',
  },
  'Blood Strike': {
    label: 'Blood Strike',
    accent: '#ef5350',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0000 100%)',
  },
  'Doomsday Last Survivors': {
    label: 'Doomsday',
    accent: '#78909c',
    bg: 'linear-gradient(135deg, #060c10 0%, #101c20 100%)',
  },
  'ARC Raiders': {
    label: 'ARC Raiders',
    accent: '#29b6f6',
    bg: 'linear-gradient(135deg, #001824 0%, #002838 100%)',
  },
  'Once Human': {
    label: 'Once Human',
    accent: '#80cbc4',
    bg: 'linear-gradient(135deg, #041410 0%, #0a2420 100%)',
  },

  // ── Streaming & apps ──────────────────────────────────────────────────────
  'Netflix': {
    label: 'Netflix',
    logo: logo('netflix'),
    accent: '#e50914',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0000 100%)',
  },
  'Spotify': {
    label: 'Spotify',
    logo: logo('spotify'),
    accent: '#1db954',
    bg: 'linear-gradient(135deg, #001a08 0%, #002e10 100%)',
  },
  'Twitch': {
    label: 'Twitch',
    logo: logo('twitch'),
    accent: '#9146ff',
    bg: 'linear-gradient(135deg, #0c0020 0%, #1a0040 100%)',
  },
  'Discord': {
    label: 'Discord',
    logo: logo('discord'),
    accent: '#5865f2',
    bg: 'linear-gradient(135deg, #060824 0%, #0e1040 100%)',
  },
  'Telegram Stars': {
    label: 'Telegram Stars',
    logo: logo('telegram'),
    accent: '#2aabee',
    bg: 'linear-gradient(135deg, #001824 0%, #00283c 100%)',
  },
  'Telegram Premium': {
    label: 'Telegram Premium',
    logo: logo('telegram'),
    accent: '#2aabee',
    bg: 'linear-gradient(135deg, #001824 0%, #00283c 100%)',
  },
  'Adobe': {
    label: 'Adobe',
    logo: logo('adobe'),
    accent: '#ff0000',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0000 100%)',
  },
  'Google Play': {
    label: 'Google Play',
    logo: logo('googleplay'),
    accent: '#01875f',
    bg: 'linear-gradient(135deg, #001810 0%, #002c1e 100%)',
  },
  'Microsoft': {
    label: 'Microsoft',
    logo: logo('microsoft'),
    accent: '#00adef',
    bg: 'linear-gradient(135deg, #001020 0%, #001e38 100%)',
  },

  // ── AI tools ──────────────────────────────────────────────────────────────
  'OpenAI': {
    label: 'OpenAI',
    logo: logo('openai'),
    accent: '#74aa9c',
    bg: 'linear-gradient(135deg, #041412 0%, #0a241e 100%)',
  },
  'ChatGPT': {
    label: 'ChatGPT',
    logo: logo('openai'),
    accent: '#74aa9c',
    bg: 'linear-gradient(135deg, #041412 0%, #0a241e 100%)',
  },
  'Claude': {
    label: 'Claude',
    logo: logo('claude'),
    accent: '#d97757',
    bg: 'linear-gradient(135deg, #1a0c08 0%, #2c1810 100%)',
  },
  'Claude Gift': {
    label: 'Claude Gift',
    logo: logo('claude'),
    accent: '#d97757',
    bg: 'linear-gradient(135deg, #1a0c08 0%, #2c1810 100%)',
  },
  'Midjourney': {
    label: 'Midjourney',
    accent: '#e8ecff',
    bg: 'linear-gradient(135deg, #080810 0%, #101020 100%)',
  },
  'Elevenlabs': {
    label: 'ElevenLabs',
    logo: logo('elevenlabs'),
    accent: '#f5a623',
    bg: 'linear-gradient(135deg, #180e00 0%, #261800 100%)',
  },
  'Suno AI': {
    label: 'Suno AI',
    logo: logo('suno'),
    accent: '#ff6b6b',
    bg: 'linear-gradient(135deg, #1a0808 0%, #2c1010 100%)',
  },
  'Freepik': {
    label: 'Freepik',
    logo: logo('freepik'),
    accent: '#1fb5ff',
    bg: 'linear-gradient(135deg, #001824 0%, #002838 100%)',
  },
  'Loom': {
    label: 'Loom',
    logo: logo('loom'),
    accent: '#625df5',
    bg: 'linear-gradient(135deg, #060824 0%, #0c1040 100%)',
  },
  'Ideogram': {
    label: 'Ideogram',
    accent: '#e8ecff',
    bg: 'linear-gradient(135deg, #080810 0%, #101020 100%)',
  },

  // ── Other services ────────────────────────────────────────────────────────
  'JetBrains': {
    label: 'JetBrains',
    logo: logo('jetbrains'),
    accent: '#fe315d',
    bg: 'linear-gradient(135deg, #1a000e 0%, #2c001c 100%)',
  },
  'Zoom': {
    label: 'Zoom',
    logo: logo('zoom'),
    accent: '#2d8cff',
    bg: 'linear-gradient(135deg, #001428 0%, #00223e 100%)',
  },
  'Airbnb': {
    label: 'Airbnb',
    logo: logo('airbnb'),
    accent: '#ff5a5f',
    bg: 'linear-gradient(135deg, #1a0204 0%, #2c0408 100%)',
  },
  'Amazon.com': {
    label: 'Amazon',
    logo: logo('amazon'),
    accent: '#ff9900',
    bg: 'linear-gradient(135deg, #181000 0%, #281c00 100%)',
  },
  'eBay': {
    label: 'eBay',
    logo: logo('ebay'),
    accent: '#e53238',
    bg: 'linear-gradient(135deg, #1a0000 0%, #2c0606 100%)',
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
