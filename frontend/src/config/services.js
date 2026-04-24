const SI = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons'
const logo = slug => `${SI}/${slug}.svg`

// Converts black SVG → brand color via CSS filter
export function colorFilter(hex) {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
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
  const brt = Math.min(200, Math.round(lPct * 2.2 + 10))
  const sat = Math.min(1000, Math.round(sPct * 10 + 200))
  return `brightness(0) saturate(100%) invert(1) sepia(1) saturate(${sat}%) hue-rotate(${hDeg}deg) brightness(${brt}%)`
}

// ─────────────────────────────────────────────────────────────────────────────
// Цветовая палитра: тёмный игровой стиль.
// Акценты — приглушённые, не кричащие. Красный только тёмный (бордо/вишня).
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_CONFIG = {

  // ── Игровые платформы ────────────────────────────────────────────────────

  'APPLE ID': {
    label: 'Apple ID',
    logo: logo('apple'),
    accent: '#a8b0bc',
    bg: 'linear-gradient(135deg, #191a1e 0%, #272930 100%)',
  },
  'Playstation': {
    label: 'PlayStation',
    logo: logo('playstation'),
    accent: '#0078c8',
    bg: 'linear-gradient(135deg, #000e22 0%, #001838 100%)',
  },
  'Xbox': {
    label: 'Xbox',
    logo: logo('xbox'),
    accent: '#3ea832',
    bg: 'linear-gradient(135deg, #04120a 0%, #0a2212 100%)',
  },
  'Nintendo': {
    label: 'Nintendo',
    logo: logo('nintendo'),
    accent: '#c8001a',
    bg: 'linear-gradient(135deg, #180004 0%, #2a000a 100%)',
  },
  'Steam': {
    label: 'Steam',
    logo: logo('steam'),
    accent: '#5aace0',
    bg: 'linear-gradient(135deg, #0a1420 0%, #162030 100%)',
  },
  'Battle.net': {
    label: 'Battle.net',
    logo: logo('activision'),
    accent: '#00a8e8',
    bg: 'linear-gradient(135deg, #001828 0%, #00263c 100%)',
  },

  // ── Шутеры и экшены ──────────────────────────────────────────────────────

  'Valorant': {
    label: 'Valorant',
    logo: logo('valorant'),
    accent: '#c42840',
    bg: 'linear-gradient(135deg, #120008 0%, #200010 100%)',
  },
  'Fortnite': {
    label: 'Fortnite',
    logo: logo('fortnite'),
    accent: '#009ecc',
    bg: 'linear-gradient(135deg, #001620 0%, #002430 100%)',
  },
  'PUBG Mobile': {
    label: 'PUBG Mobile',
    logo: logo('pubg'),
    accent: '#d4960e',
    bg: 'linear-gradient(135deg, #160e00 0%, #261a00 100%)',
  },
  'PUBG Battleground': {
    label: 'PUBG PC',
    logo: logo('pubg'),
    accent: '#b89848',
    bg: 'linear-gradient(135deg, #141008 0%, #221c0c 100%)',
  },
  'Call of Duty': {
    label: 'Call of Duty',
    logo: logo('activision'),
    accent: '#c8a832',
    bg: 'linear-gradient(135deg, #120e00 0%, #201800 100%)',
  },
  'Apex Legends Mobile': {
    label: 'Apex Legends',
    logo: logo('ea'),
    accent: '#c03830',
    bg: 'linear-gradient(135deg, #180600 0%, #280c00 100%)',
  },
  'HELLDIVERS 2': {
    label: 'HELLDIVERS 2',
    logo: logo('playstation'),
    accent: '#c8a800',
    bg: 'linear-gradient(135deg, #100e00 0%, #1e1a00 100%)',
  },
  'DOOM The Dark Ages': {
    label: 'DOOM',
    accent: '#c03020',
    bg: 'linear-gradient(135deg, #180400 0%, #280800 100%)',
  },
  'Blood Strike': {
    accent: '#a02828',
    bg: 'linear-gradient(135deg, #140404 0%, #220808 100%)',
  },
  'Point Blank': {
    accent: '#607888',
    bg: 'linear-gradient(135deg, #080e12 0%, #101820 100%)',
  },
  'Delta Force': {
    accent: '#6e8898',
    bg: 'linear-gradient(135deg, #080c10 0%, #101820 100%)',
  },
  'ARC Raiders': {
    accent: '#4898c8',
    bg: 'linear-gradient(135deg, #001424 0%, #001e34 100%)',
  },
  'Arena Breakout': {
    accent: '#d88000',
    bg: 'linear-gradient(135deg, #160a00 0%, #241400 100%)',
  },

  // ── MOBA и стратегии ─────────────────────────────────────────────────────

  'League Of Legends': {
    label: 'League of Legends',
    logo: logo('leagueoflegends'),
    accent: '#b8921e',
    bg: 'linear-gradient(135deg, #0c0800 0%, #1a1200 100%)',
  },
  'Honor of Kings': {
    label: 'Honor of Kings',
    accent: '#c89818',
    bg: 'linear-gradient(135deg, #100c00 0%, #1e1600 100%)',
  },
  'Mobile Legends': {
    label: 'Mobile Legends',
    accent: '#a82828',
    bg: 'linear-gradient(135deg, #160404 0%, #240808 100%)',
  },
  'Mobile Legends GLOBAL': {
    label: 'ML: Bang Bang',
    accent: '#a82828',
    bg: 'linear-gradient(135deg, #160404 0%, #240808 100%)',
  },
  'Magic Chess Go Go': {
    label: 'Magic Chess',
    accent: '#8858b8',
    bg: 'linear-gradient(135deg, #0c0018 0%, #180028 100%)',
  },
  'Sid Meiers Civilization VI': {
    label: 'Civilization VI',
    logo: logo('2k'),
    accent: '#9890a8',
    bg: 'linear-gradient(135deg, #0a0810 0%, #14101e 100%)',
  },
  'Watcher Of Realms': {
    accent: '#6870b0',
    bg: 'linear-gradient(135deg, #080c18 0%, #10142a 100%)',
  },
  'MARVEL Mystic Mayhem': {
    label: 'Marvel Mystic Mayhem',
    accent: '#a82030',
    bg: 'linear-gradient(135deg, #140006 0%, #22000c 100%)',
  },
  'Marvel Rivals': {
    label: 'Marvel Rivals',
    accent: '#a82030',
    bg: 'linear-gradient(135deg, #140006 0%, #22000c 100%)',
  },
  'Super SUS': {
    accent: '#7838a8',
    bg: 'linear-gradient(135deg, #0c0018 0%, #1a0030 100%)',
  },
  'Top Eleven Be Football Manager': {
    label: 'Top Eleven',
    accent: '#309848',
    bg: 'linear-gradient(135deg, #040e08 0%, #081a0e 100%)',
  },

  // ── RPG и приключения ────────────────────────────────────────────────────

  'Genshin Impact': {
    accent: '#4898c0',
    bg: 'linear-gradient(135deg, #001422 0%, #002034 100%)',
  },
  'Honkai Star Rail': {
    accent: '#8878d0',
    bg: 'linear-gradient(135deg, #08001e 0%, #100030 100%)',
  },
  'Wuthering Waves': {
    accent: '#38b8c8',
    bg: 'linear-gradient(135deg, #001418 0%, #002028 100%)',
  },
  'AFK Journey': {
    accent: '#6840d8',
    bg: 'linear-gradient(135deg, #08001c 0%, #120030 100%)',
  },
  'Once Human': {
    accent: '#68a898',
    bg: 'linear-gradient(135deg, #04100e 0%, #081e1a 100%)',
  },
  'Dragonheir Silent Gods': {
    label: 'Dragonheir',
    accent: '#c87020',
    bg: 'linear-gradient(135deg, #160800 0%, #240e00 100%)',
  },
  'Love and Deepspace': {
    accent: '#d07898',
    bg: 'linear-gradient(135deg, #160010 0%, #240020 100%)',
  },
  'Identity V': {
    accent: '#a09060',
    bg: 'linear-gradient(135deg, #0e0c04 0%, #1c1808 100%)',
  },
  'Destiny 2': {
    accent: '#9098a8',
    bg: 'linear-gradient(135deg, #080c14 0%, #101822 100%)',
  },
  'Destiny Rising': {
    accent: '#8898b0',
    bg: 'linear-gradient(135deg, #080c14 0%, #101822 100%)',
  },
  'Black Desert': {
    accent: '#a05030',
    bg: 'linear-gradient(135deg, #120600 0%, #200c00 100%)',
  },
  'EVE Echoes': {
    accent: '#2898d8',
    bg: 'linear-gradient(135deg, #001424 0%, #002038 100%)',
  },
  'Onmyoji Arena': {
    label: 'Onmyoji Arena',
    accent: '#c09070',
    bg: 'linear-gradient(135deg, #100a04 0%, #1e1208 100%)',
  },
  'Goddess of Victory Nikke': {
    label: 'NIKKE',
    accent: '#b848d8',
    bg: 'linear-gradient(135deg, #10001c 0%, #1e0030 100%)',
  },
  'Snowbreak Containment Zone': {
    label: 'Snowbreak',
    accent: '#38a8d8',
    bg: 'linear-gradient(135deg, #001420 0%, #002030 100%)',
  },
  'Farlight 84': {
    accent: '#00c8d8',
    bg: 'linear-gradient(135deg, #001418 0%, #002028 100%)',
  },
  'New State Mobile': {
    accent: '#7888a0',
    bg: 'linear-gradient(135deg, #080c12 0%, #101820 100%)',
  },
  'Harry Potter Magic Awakened': {
    label: 'Harry Potter',
    accent: '#b09840',
    bg: 'linear-gradient(135deg, #0e0a00 0%, #1c1600 100%)',
  },
  'Clair Obscur Expedition 33': {
    label: 'Clair Obscur',
    accent: '#a878c8',
    bg: 'linear-gradient(135deg, #0e0018 0%, #1c0028 100%)',
  },
  'LEGO Star Wars': {
    label: 'LEGO Star Wars',
    accent: '#c8a800',
    bg: 'linear-gradient(135deg, #100e00 0%, #1e1800 100%)',
  },

  // ── Survival и ужасы ─────────────────────────────────────────────────────

  'Free Fire': {
    accent: '#c86000',
    bg: 'linear-gradient(135deg, #140800 0%, #221000 100%)',
  },
  'State of Survival Zombie War': {
    label: 'State of Survival',
    accent: '#a83820',
    bg: 'linear-gradient(135deg, #140600 0%, #220a00 100%)',
  },
  'LifeAfter': {
    accent: '#50a060',
    bg: 'linear-gradient(135deg, #04100a 0%, #081c10 100%)',
  },
  'Doomsday Last Survivors': {
    label: 'Doomsday',
    accent: '#688090',
    bg: 'linear-gradient(135deg, #080c10 0%, #10181e 100%)',
  },
  'Stumble Guys': {
    accent: '#e07820',
    bg: 'linear-gradient(135deg, #160800 0%, #241200 100%)',
  },
  'Zepeto': {
    accent: '#d05888',
    bg: 'linear-gradient(135deg, #160010 0%, #24001e 100%)',
  },
  'Likee': {
    accent: '#e05050',
    bg: 'linear-gradient(135deg, #160404 0%, #240808 100%)',
  },

  // ── Классика и ретро ─────────────────────────────────────────────────────

  'Resident Evil Requiem': {
    label: 'Resident Evil',
    accent: '#a03020',
    bg: 'linear-gradient(135deg, #140400 0%, #220800 100%)',
  },
  'Resident Evil 4': {
    label: 'Resident Evil 4',
    accent: '#a03020',
    bg: 'linear-gradient(135deg, #140400 0%, #220800 100%)',
  },
  'Resident Evil Village': {
    label: 'RE: Village',
    accent: '#a03020',
    bg: 'linear-gradient(135deg, #140400 0%, #220800 100%)',
  },
  'DARK SOULS REMASTERED': {
    label: 'Dark Souls',
    accent: '#c0a858',
    bg: 'linear-gradient(135deg, #100c04 0%, #1e1808 100%)',
  },
  'God of War': {
    accent: '#a02820',
    bg: 'linear-gradient(135deg, #140400 0%, #220800 100%)',
  },
  'God of War Ragnarok': {
    label: 'God of War',
    accent: '#a02820',
    bg: 'linear-gradient(135deg, #140400 0%, #220800 100%)',
  },
  'Mortal Kombat 11': {
    label: 'Mortal Kombat',
    accent: '#a82820',
    bg: 'linear-gradient(135deg, #140400 0%, #220800 100%)',
  },
  'MORTAL KOMBAT XL': {
    label: 'MK XL',
    accent: '#a82820',
    bg: 'linear-gradient(135deg, #140400 0%, #220800 100%)',
  },
  'Street Fighter 6': {
    label: 'Street Fighter',
    accent: '#c07020',
    bg: 'linear-gradient(135deg, #140a00 0%, #221400 100%)',
  },
  'The Last of Us Part II': {
    label: 'The Last of Us',
    accent: '#689858',
    bg: 'linear-gradient(135deg, #060e06 0%, #0c1a0a 100%)',
  },
  'Metro Exodus': {
    accent: '#907868',
    bg: 'linear-gradient(135deg, #100c08 0%, #1e1610 100%)',
  },
  'Metro Redux': {
    label: 'Metro Redux',
    accent: '#887060',
    bg: 'linear-gradient(135deg, #100c08 0%, #1e1610 100%)',
  },
  'Metro 2033': {
    label: 'Metro 2033',
    accent: '#887060',
    bg: 'linear-gradient(135deg, #100c08 0%, #1e1610 100%)',
  },
  'Mafia III': {
    accent: '#c8a020',
    bg: 'linear-gradient(135deg, #100c00 0%, #1e1600 100%)',
  },
  'Just Cause 3': {
    accent: '#489858',
    bg: 'linear-gradient(135deg, #040e08 0%, #081a0e 100%)',
  },
  'Arma 3': {
    accent: '#607870',
    bg: 'linear-gradient(135deg, #080e0c 0%, #101a16 100%)',
  },
  'Devil May Cry HD': {
    label: 'Devil May Cry',
    accent: '#c02820',
    bg: 'linear-gradient(135deg, #140400 0%, #220800 100%)',
  },
  'Legacy of Kain Soul Reaver': {
    label: 'Legacy of Kain',
    accent: '#8058a8',
    bg: 'linear-gradient(135deg, #0c0018 0%, #180028 100%)',
  },
  'Mobile Royale': {
    accent: '#8858a8',
    bg: 'linear-gradient(135deg, #0c0018 0%, #180028 100%)',
  },

  // ── Прочие игры ──────────────────────────────────────────────────────────

  'Razer Gold': {
    label: 'Razer Gold',
    logo: logo('razer'),
    accent: '#30b820',
    bg: 'linear-gradient(135deg, #031000 0%, #082000 100%)',
  },
  'Roblox': {
    logo: logo('roblox'),
    accent: '#a82020',
    bg: 'linear-gradient(135deg, #140404 0%, #220808 100%)',
  },
  'Minecraft': {
    logo: logo('minecraft'),
    accent: '#48a860',
    bg: 'linear-gradient(135deg, #041008 0%, #081e10 100%)',
  },
  'Genshin Impact': {
    accent: '#4898c0',
    bg: 'linear-gradient(135deg, #001422 0%, #002034 100%)',
  },

  // ── Стриминг и соцсети ───────────────────────────────────────────────────

  'Netflix': {
    logo: logo('netflix'),
    accent: '#9a0012',
    bg: 'linear-gradient(135deg, #140004 0%, #220008 100%)',
  },
  'Spotify': {
    logo: logo('spotify'),
    accent: '#18a848',
    bg: 'linear-gradient(135deg, #001808 0%, #002a10 100%)',
  },
  'Twitch': {
    logo: logo('twitch'),
    accent: '#7030c8',
    bg: 'linear-gradient(135deg, #0a0018 0%, #160030 100%)',
  },
  'Discord': {
    logo: logo('discord'),
    accent: '#4858e8',
    bg: 'linear-gradient(135deg, #040820 0%, #081038 100%)',
  },
  'Telegram Stars': {
    label: 'Telegram Stars',
    logo: logo('telegram'),
    accent: '#1898d8',
    bg: 'linear-gradient(135deg, #001828 0%, #002440 100%)',
  },
  'Telegram Premium': {
    label: 'Telegram Premium',
    logo: logo('telegram'),
    accent: '#1898d8',
    bg: 'linear-gradient(135deg, #001828 0%, #002440 100%)',
  },
  'Revid': {
    accent: '#d04858',
    bg: 'linear-gradient(135deg, #140008 0%, #220012 100%)',
  },

  // ── Сервисы и инструменты ────────────────────────────────────────────────

  'Adobe': {
    logo: logo('adobe'),
    accent: '#c82820',
    bg: 'linear-gradient(135deg, #180400 0%, #280800 100%)',
  },
  'Google Play': {
    label: 'Google Play',
    logo: logo('googleplay'),
    accent: '#18a870',
    bg: 'linear-gradient(135deg, #001810 0%, #002a1c 100%)',
  },
  'Microsoft': {
    logo: logo('microsoft'),
    accent: '#009ad0',
    bg: 'linear-gradient(135deg, #001424 0%, #002038 100%)',
  },
  'Amazon.com': {
    label: 'Amazon',
    logo: logo('amazon'),
    accent: '#d89000',
    bg: 'linear-gradient(135deg, #180e00 0%, #281800 100%)',
  },
  'eBay': {
    logo: logo('ebay'),
    accent: '#2858c8',
    bg: 'linear-gradient(135deg, #04082a 0%, #081040 100%)',
  },
  'Airbnb': {
    logo: logo('airbnb'),
    accent: '#c84858',
    bg: 'linear-gradient(135deg, #180006 0%, #28000e 100%)',
  },
  'Zoom': {
    logo: logo('zoom'),
    accent: '#1880e8',
    bg: 'linear-gradient(135deg, #001428 0%, #002040 100%)',
  },
  'JetBrains': {
    logo: logo('jetbrains'),
    accent: '#e82058',
    bg: 'linear-gradient(135deg, #180008 0%, #280014 100%)',
  },
  'Loom': {
    logo: logo('loom'),
    accent: '#5848e0',
    bg: 'linear-gradient(135deg, #060820 0%, #0e1038 100%)',
  },
  'Freepik': {
    logo: logo('freepik'),
    accent: '#18a8e8',
    bg: 'linear-gradient(135deg, #001828 0%, #003040 100%)',
  },
  'Sider': {
    accent: '#4888d8',
    bg: 'linear-gradient(135deg, #001428 0%, #002040 100%)',
  },
  'KREA.AI': {
    accent: '#8858d8',
    bg: 'linear-gradient(135deg, #080018 0%, #10002c 100%)',
  },
  'GAMMA.APP': {
    accent: '#9858d8',
    bg: 'linear-gradient(135deg, #080018 0%, #10002c 100%)',
  },
  'Fal.AI': {
    accent: '#48a8c8',
    bg: 'linear-gradient(135deg, #001820 0%, #002c34 100%)',
  },
  'HIGGSFIELD AI': {
    accent: '#7878c8',
    bg: 'linear-gradient(135deg, #080814 0%, #101022 100%)',
  },

  // ── AI ────────────────────────────────────────────────────────────────────

  'OpenAI': {
    logo: logo('openai'),
    accent: '#60a898',
    bg: 'linear-gradient(135deg, #041210 0%, #0a2020 100%)',
  },
  'ChatGPT': {
    logo: logo('openai'),
    accent: '#60a898',
    bg: 'linear-gradient(135deg, #041210 0%, #0a2020 100%)',
  },
  'Claude': {
    logo: logo('claude'),
    accent: '#c86840',
    bg: 'linear-gradient(135deg, #180c06 0%, #281810 100%)',
  },
  'Claude Gift': {
    label: 'Claude Gift',
    logo: logo('claude'),
    accent: '#c86840',
    bg: 'linear-gradient(135deg, #180c06 0%, #281810 100%)',
  },
  'Midjourney': {
    accent: '#9898b8',
    bg: 'linear-gradient(135deg, #080810 0%, #10101e 100%)',
  },
  'Elevenlabs': {
    logo: logo('elevenlabs'),
    accent: '#d89030',
    bg: 'linear-gradient(135deg, #160c00 0%, #241800 100%)',
  },
  'Suno AI': {
    logo: logo('suno'),
    accent: '#e06068',
    bg: 'linear-gradient(135deg, #160008 0%, #240012 100%)',
  },
  'Freepik': {
    logo: logo('freepik'),
    accent: '#18a8e8',
    bg: 'linear-gradient(135deg, #001828 0%, #003040 100%)',
  },
  'Ideogram': {
    accent: '#9898c8',
    bg: 'linear-gradient(135deg, #080810 0%, #101020 100%)',
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
  'APPLE ID', 'Nintendo', 'Playstation', 'Xbox', 'Steam',
  'Valorant', 'PUBG Mobile', 'PUBG Battleground', 'Razer Gold',
]
