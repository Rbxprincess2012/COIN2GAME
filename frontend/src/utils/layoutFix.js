// Maps English keyboard positions → Russian characters (when RU layout is active)
const EN_TO_RU = {
  'q':'й','w':'ц','e':'у','r':'к','t':'е','y':'н','u':'г','i':'ш','o':'щ','p':'з',
  '[':'х',']':'ъ','a':'ф','s':'ы','d':'в','f':'а','g':'п','h':'р','j':'о','k':'л',
  'l':'д',';':'ж',"'":'э','z':'я','x':'ч','c':'с','v':'м','b':'и','n':'т','m':'ь',
  ',':'б','.':'ю','`':'ё',
}

const RU_TO_EN = Object.fromEntries(
  Object.entries(EN_TO_RU).map(([en, ru]) => [ru, en])
)

function convertChar(char, map) {
  const lo = char.toLowerCase()
  const mapped = map[lo]
  if (!mapped) return char
  return char === lo ? mapped : mapped.toUpperCase()
}

// Returns the string converted assuming the wrong layout was used
function convert(str, map) {
  return [...str].map(c => convertChar(c, map)).join('')
}

// Detect if string is mostly Cyrillic
function isMostlyCyrillic(str) {
  const letters = [...str].filter(c => /[a-zа-яё]/i.test(c))
  if (!letters.length) return false
  const cyrillic = letters.filter(c => /[а-яё]/i.test(c))
  return cyrillic.length / letters.length > 0.5
}

/**
 * Given a search query, returns:
 * - original: the input as-is
 * - fixed: the layout-corrected version (may equal original if no fix needed)
 * - wasFixed: true if the fixed version differs from original
 */
export function fixLayout(query) {
  const original = query
  if (!query.trim()) return { original, fixed: original, wasFixed: false }

  const fixed = isMostlyCyrillic(query)
    ? convert(query, RU_TO_EN)   // typed with EN layout → convert to RU→EN
    : convert(query, EN_TO_RU)   // typed with RU layout → convert to EN→RU

  const wasFixed = fixed.toLowerCase() !== original.toLowerCase()
  return { original, fixed: wasFixed ? fixed : original, wasFixed }
}

/**
 * Returns all variants to search: original + layout-fixed (if different)
 */
export function searchVariants(query) {
  const { original, fixed, wasFixed } = fixLayout(query)
  return wasFixed ? [original, fixed] : [original]
}
