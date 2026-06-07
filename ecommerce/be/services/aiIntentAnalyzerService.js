import { coerceBoolean, normalizeTextFold, sanitizeStringArray } from './aiJsonUtils.js'
import { generateGeminiJson } from './geminiService.js'

const KNOWN_BRANDS = [
  'apple',
  'google',
  'dell',
  'asus',
  'hp',
  'lenovo',
  'acer',
  'msi',
  'samsung',
  'xiaomi',
  'oppo',
  'vivo',
  'redmi',
  'poco',
  'logitech',
  'anker',
  'baseus',
  'ugreen',
  'sony',
  'jbl',
  'keychron',
]

const FAMILY_RULES = [
  {
    brand: 'apple',
    family: 'MacBook',
    category: 'Laptop',
    queryKeywords: ['macbook', 'mac book', 'mac os', 'macos'],
    productKeywords: ['macbook', 'mac os', 'macos'],
  },
  {
    brand: 'apple',
    family: 'iPhone',
    category: 'Phone',
    queryKeywords: ['iphone', 'ios'],
    productKeywords: ['iphone', 'ios'],
  },
  {
    brand: 'apple',
    family: 'AirPods',
    category: 'Headphones',
    queryKeywords: ['airpods'],
    productKeywords: ['airpods'],
  },
  {
    brand: 'apple',
    family: 'Apple Watch',
    category: 'Smartwatch',
    queryKeywords: ['apple watch', 'watch se', 'watch series', 'watch ultra'],
    productKeywords: ['apple watch', 'watch se', 'watch series', 'watch ultra'],
  },
  {
    brand: 'lenovo',
    family: 'ThinkPad',
    category: 'Laptop',
    queryKeywords: ['thinkpad'],
    productKeywords: ['thinkpad'],
  },
  {
    brand: 'lenovo',
    family: 'Legion',
    category: 'Laptop',
    queryKeywords: ['legion'],
    productKeywords: ['legion'],
  },
  {
    brand: 'lenovo',
    family: 'LOQ',
    category: 'Laptop',
    queryKeywords: ['loq'],
    productKeywords: ['loq'],
  },
  {
    brand: 'lenovo',
    family: 'Yoga',
    category: 'Laptop',
    queryKeywords: ['yoga'],
    productKeywords: ['yoga'],
  },
  {
    brand: 'dell',
    family: 'XPS',
    category: 'Laptop',
    queryKeywords: ['xps'],
    productKeywords: ['xps'],
  },
  {
    brand: 'dell',
    family: 'Inspiron',
    category: 'Laptop',
    queryKeywords: ['inspiron'],
    productKeywords: ['inspiron'],
  },
  {
    brand: 'dell',
    family: 'Vostro',
    category: 'Laptop',
    queryKeywords: ['vostro'],
    productKeywords: ['vostro'],
  },
  {
    brand: 'asus',
    family: 'Zenbook',
    category: 'Laptop',
    queryKeywords: ['zenbook'],
    productKeywords: ['zenbook'],
  },
  {
    brand: 'asus',
    family: 'Vivobook',
    category: 'Laptop',
    queryKeywords: ['vivobook'],
    productKeywords: ['vivobook'],
  },
  {
    brand: 'asus',
    family: 'ROG',
    category: 'Laptop',
    queryKeywords: ['rog', 'rog strix'],
    productKeywords: ['rog'],
  },
  {
    brand: 'asus',
    family: 'TUF',
    category: 'Laptop',
    queryKeywords: ['tuf'],
    productKeywords: ['tuf'],
  },
  {
    brand: 'acer',
    family: 'Aspire',
    category: 'Laptop',
    queryKeywords: ['aspire'],
    productKeywords: ['aspire'],
  },
  {
    brand: 'acer',
    family: 'Nitro',
    category: 'Laptop',
    queryKeywords: ['nitro'],
    productKeywords: ['nitro'],
  },
  {
    brand: 'acer',
    family: 'Predator',
    category: 'Laptop',
    queryKeywords: ['predator'],
    productKeywords: ['predator'],
  },
  {
    brand: 'hp',
    family: 'Pavilion',
    category: 'Laptop',
    queryKeywords: ['pavilion'],
    productKeywords: ['pavilion'],
  },
  {
    brand: 'hp',
    family: 'Envy',
    category: 'Laptop',
    queryKeywords: ['envy'],
    productKeywords: ['envy'],
  },
  {
    brand: 'hp',
    family: 'Omen',
    category: 'Laptop',
    queryKeywords: ['omen'],
    productKeywords: ['omen'],
  },
  {
    brand: 'hp',
    family: 'Victus',
    category: 'Laptop',
    queryKeywords: ['victus'],
    productKeywords: ['victus'],
  },
  {
    brand: 'samsung',
    family: 'Galaxy',
    category: 'Phone',
    queryKeywords: ['galaxy', 'samsung galaxy', 'galaxy s', 'galaxy z', 'galaxy a'],
    productKeywords: ['galaxy'],
  },
  {
    brand: 'samsung',
    family: 'Galaxy Watch',
    category: 'Smartwatch',
    queryKeywords: ['galaxy watch', 'samsung watch', 'watch 7', 'watch ultra'],
    productKeywords: ['galaxy watch', 'watch'],
  },
  {
    brand: 'google',
    family: 'Pixel',
    category: 'Phone',
    queryKeywords: ['pixel', 'google pixel'],
    productKeywords: ['pixel'],
  },
  {
    brand: 'xiaomi',
    family: 'Redmi',
    category: 'Phone',
    queryKeywords: ['redmi', 'redmi note'],
    productKeywords: ['redmi'],
  },
  {
    brand: 'xiaomi',
    family: 'POCO',
    category: 'Phone',
    queryKeywords: ['poco'],
    productKeywords: ['poco'],
  },
  {
    brand: 'xiaomi',
    family: 'Xiaomi',
    category: 'Phone',
    queryKeywords: ['xiaomi', 'mi phone'],
    productKeywords: ['xiaomi'],
  },
  {
    brand: 'oppo',
    family: 'OPPO Find',
    category: 'Phone',
    queryKeywords: ['oppo find', 'find x'],
    productKeywords: ['find'],
  },
  {
    brand: 'oppo',
    family: 'OPPO Reno',
    category: 'Phone',
    queryKeywords: ['reno'],
    productKeywords: ['reno'],
  },
  {
    brand: 'oppo',
    family: 'OPPO A',
    category: 'Phone',
    queryKeywords: ['oppo a', 'a series'],
    productKeywords: ['oppo a'],
  },
  {
    brand: 'vivo',
    family: 'vivo X',
    category: 'Phone',
    queryKeywords: ['vivo x'],
    productKeywords: ['vivo x'],
  },
  {
    brand: 'vivo',
    family: 'vivo V',
    category: 'Phone',
    queryKeywords: ['vivo v'],
    productKeywords: ['vivo v'],
  },
  {
    brand: 'vivo',
    family: 'vivo Y',
    category: 'Phone',
    queryKeywords: ['vivo y'],
    productKeywords: ['vivo y'],
  },
  {
    brand: 'sony',
    family: 'Sony WH',
    category: 'Headphones',
    queryKeywords: ['sony wh', 'wh-1000xm', 'wh 1000xm', 'wh1000xm'],
    productKeywords: ['sony', 'wh-1000xm'],
  },
  {
    brand: 'sony',
    family: 'Sony WF',
    category: 'Headphones',
    queryKeywords: ['sony wf', 'wf-1000xm', 'wf 1000xm', 'wf1000xm'],
    productKeywords: ['sony', 'wf-1000xm'],
  },
  {
    brand: 'jbl',
    family: 'JBL',
    category: 'Headphones',
    queryKeywords: ['jbl'],
    productKeywords: ['jbl'],
  },
  {
    brand: 'logitech',
    family: 'Logitech MX',
    category: 'Mouse',
    queryKeywords: ['logitech mx', 'mx master', 'mx anywhere'],
    productKeywords: ['logitech mx', 'mx master', 'mx anywhere'],
  },
  {
    brand: 'logitech',
    family: 'Logitech G',
    category: 'Mouse',
    queryKeywords: ['logitech g', 'g pro', 'g102', 'g304', 'lightspeed', 'superlight'],
    productKeywords: ['logitech g', 'g pro', 'g102', 'g304', 'lightspeed', 'superlight'],
  },
  {
    brand: 'keychron',
    family: 'Keychron',
    category: 'Keyboard',
    queryKeywords: ['keychron'],
    productKeywords: ['keychron'],
  },
]

const CATEGORY_RULES = [
  { category: 'Tablet', keywords: ['tablet', 'ipad', 'may tinh bang'] },
  {
    category: 'Laptop',
    keywords: ['laptop', 'notebook', 'macbook', 'may tinh xach tay', 'may tinh', 'pc', 'computer', 'gaming pc'],
  },
  { category: 'Phone', keywords: ['dien thoai', 'phone', 'smartphone', 'mobile', 'iphone', 'galaxy', 'redmi'] },
  { category: 'Headphones', keywords: ['tai nghe', 'headphone', 'earbud', 'airpods', 'loa', 'audio', 'chong on'] },
  { category: 'Monitor', keywords: ['man hinh', 'monitor', 'display'] },
  { category: 'Mouse', keywords: ['chuot', 'mouse'] },
  { category: 'Keyboard', keywords: ['ban phim', 'keyboard'] },
  { category: 'SSD', keywords: ['ssd', 'ocung', 'o cung', 'storage'] },
  { category: 'RAM', keywords: ['ram', 'bo nho'] },
  { category: 'Power Bank', keywords: ['sac du phong', 'power bank'] },
  { category: 'Charging Cable', keywords: ['cap sac', 'charging cable', 'usb c', 'usb-c'] },
  { category: 'Charger', keywords: ['charger', 'sac', 'adapter', 'cu sac', 'bo sac'] },
  { category: 'Router', keywords: ['router', 'wifi', 'modem'] },
  { category: 'Smartwatch', keywords: ['smartwatch', 'dong ho thong minh'] },
]

const PRIORITY_RULES = [
  { label: 'pin tot', keywords: ['pin', 'thoi luong pin', 'battery', 'pin trau'] },
  { label: 'nhe', keywords: ['nhe', 'mong', 'di dong'] },
  { label: 'hieu nang', keywords: ['hieu nang', 'manh', 'cpu', 'ram'] },
  { label: 'gia tot', keywords: ['gia re', 're hon', 'gia tot', 'tiet kiem', 'value'] },
  { label: 'chong on', keywords: ['chong on', 'noise cancelling', 'anc'] },
]

const USE_CASE_RULES = [
  { useCase: 'hoc lap trinh', keywords: ['lap trinh', 'code', 'dev', 'it', 'cntt'] },
  { useCase: 'hoc tap', keywords: ['hoc', 'sinh vien', 'ghi chu', 'on thi'] },
  { useCase: 'hoc online', keywords: ['hoc online', 'zoom', 'meet', 'hoc tu xa'] },
  { useCase: 'gaming', keywords: ['game', 'gaming', 'fps', 'esports'] },
  { useCase: 'van phong', keywords: ['van phong', 'office', 'lam viec'] },
]

function normalizeText(value = '') {
  return String(value || '').trim()
}

function parseBudgetFromMessage(message = '') {
  const normalized = normalizeTextFold(message)
  const budgetUnitPattern = '(trieu|triu|tr|k|nghin|ngin|vnd|dong)?'

  const underPattern = new RegExp(
    `(?:duoi|dui|khong qua|toi da|under|less than)\\s*(\\d+(?:[.,]\\d+)?)\\s*${budgetUnitPattern}`,
    'i',
  )

  const rangePattern = new RegExp(
    `(?:tu|from)\\s*(\\d+(?:[.,]\\d+)?)\\s*${budgetUnitPattern}\\s*(?:den|-|to)\\s*(\\d+(?:[.,]\\d+)?)\\s*${budgetUnitPattern}`,
    'i',
  )

  const exactPattern = new RegExp(
    `(?:tam|khoang|around|budget)?\\s*(\\d+(?:[.,]\\d+)?)\\s*${budgetUnitPattern}`,
    'i',
  )

  function toVnd(rawValue, rawUnit) {
    const value = Number(String(rawValue || '').replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      return null
    }

    const unit = normalizeTextFold(rawUnit || '')
    if (['trieu', 'triu', 'tr'].includes(unit)) {
      return Math.round(value * 1_000_000)
    }

    if (['k', 'nghin', 'ngin'].includes(unit)) {
      return Math.round(value * 1_000)
    }

    if (['vnd', 'dong'].includes(unit)) {
      return Math.round(value)
    }

    if (value <= 500) {
      return Math.round(value * 1_000_000)
    }

    return Math.round(value)
  }

  const rangeMatch = normalized.match(rangePattern)
  if (rangeMatch) {
    const min = toVnd(rangeMatch[1], rangeMatch[2])
    const max = toVnd(rangeMatch[3], rangeMatch[4])
    return {
      min: min && max ? Math.min(min, max) : min,
      max: min && max ? Math.max(min, max) : max,
      currency: 'VND',
    }
  }

  const underMatch = normalized.match(underPattern)
  if (underMatch) {
    return {
      min: null,
      max: toVnd(underMatch[1], underMatch[2]),
      currency: 'VND',
    }
  }

  const hasBudgetIntent = /(budget|ngan sach|gia|tam|khoang|duoi|toi da|trieu|tr|vnd|dong)/i.test(normalized)
  const exactMatch = normalized.match(exactPattern)
  if (hasBudgetIntent && exactMatch) {
    const exact = toVnd(exactMatch[1], exactMatch[2])
    return {
      min: null,
      max: exact,
      currency: 'VND',
    }
  }

  return {
    min: null,
    max: null,
    currency: 'VND',
  }
}

function inferCategory(message = '') {
  const normalized = normalizeTextFold(message)

  const familyMatched = FAMILY_RULES.find((rule) =>
    rule.category && rule.queryKeywords.some((keyword) => normalized.includes(normalizeTextFold(keyword))),
  )

  if (familyMatched?.category) {
    return familyMatched.category
  }

  if (
    ['may tinh bang', 'tablet', 'ipad'].some((keyword) => normalized.includes(normalizeTextFold(keyword)))
  ) {
    return 'Tablet'
  }

  if (
    [
      'laptop',
      'notebook',
      'macbook',
      'may tinh xach tay',
      'may tinh choi game',
      'may tinh',
      'pc',
      'computer',
      'gaming pc',
    ].some((keyword) => normalized.includes(normalizeTextFold(keyword)))
  ) {
    return 'Laptop'
  }

  const matchedRule = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeTextFold(keyword))),
  )

  return matchedRule?.category || ''
}

function inferUseCase(message = '') {
  const normalized = normalizeTextFold(message)
  const matchedRule = USE_CASE_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeTextFold(keyword))),
  )

  return matchedRule?.useCase || ''
}

function inferPriorities(message = '') {
  const normalized = normalizeTextFold(message)
  return PRIORITY_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeTextFold(keyword))),
  ).map((rule) => rule.label)
}

function inferPreferredBrands(message = '') {
  const normalized = normalizeTextFold(message)
  const inferredBrands = new Set(KNOWN_BRANDS.filter((brand) => normalized.includes(brand)))

  for (const rule of FAMILY_RULES) {
    if (rule.queryKeywords.some((keyword) => normalized.includes(normalizeTextFold(keyword)))) {
      inferredBrands.add(rule.brand)
    }
  }

  return [...inferredBrands]
}

function inferPreferredProductFamilies(message = '') {
  const normalized = normalizeTextFold(message)
  return FAMILY_RULES.filter((rule) => rule.queryKeywords.some((keyword) => normalized.includes(normalizeTextFold(keyword)))).map(
    (rule) => rule.family,
  )
}

function inferAvoidBrands(message = '') {
  const normalized = normalizeTextFold(message)
  const avoidMatches = [
    ...normalized.matchAll(/(?:khong thich|khong muon|tranh|avoid|khong lay|khong chon)\s+([a-z0-9\-\s,]+)/gi),
  ]

  const candidates = avoidMatches.flatMap((match) => String(match[1] || '').split(/[\s,]+/g))

  return sanitizeStringArray(
    candidates
      .map((value) => normalizeTextFold(value))
      .filter((value) => KNOWN_BRANDS.includes(value)),
    6,
  )
}

function buildFallbackFollowUp(intent) {
  if (!intent.category) {
    return 'Bạn ưu tiên nhóm sản phẩm nào nhất (laptop, điện thoại, tai nghe...)?'
  }

  if (!intent.budget?.max) {
    return 'Bạn muốn mức ngân sách tối đa bao nhiêu?'
  }

  if (!intent.useCase) {
    return 'Bạn dùng sản phẩm chủ yếu cho mục đích gì?'
  }

  return ''
}

function buildHeuristicIntent(message = '') {
  const budget = parseBudgetFromMessage(message)

  return {
    category: inferCategory(message),
    budget,
    useCase: inferUseCase(message),
    priorities: sanitizeStringArray(inferPriorities(message), 6),
    preferredBrands: sanitizeStringArray(inferPreferredBrands(message), 6),
    preferredProductFamilies: sanitizeStringArray(inferPreferredProductFamilies(message), 6),
    avoidBrands: sanitizeStringArray(inferAvoidBrands(message), 6),
    needMoreInfo: false,
    followUpQuestion: '',
  }
}

function sanitizeIntent(input = {}, fallback = {}) {
  const budgetCandidate = input?.budget && typeof input.budget === 'object' ? input.budget : fallback.budget || {}

  function normalizeBudgetNumber(value) {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null
    }

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return null
    }

    return Math.max(0, numericValue)
  }

  const fallbackBudget = fallback?.budget && typeof fallback.budget === 'object' ? fallback.budget : {}
  const normalizedBudgetMin = normalizeBudgetNumber(budgetCandidate?.min)
  const normalizedBudgetMax = normalizeBudgetNumber(budgetCandidate?.max)
  const fallbackBudgetMin = normalizeBudgetNumber(fallbackBudget?.min)
  const fallbackBudgetMax = normalizeBudgetNumber(fallbackBudget?.max)
  const normalizedInputCategory = normalizeText(input?.category || '')
  const normalizedFallbackCategory = normalizeText(fallback.category || '')
  const normalizedInputUseCase = normalizeText(input?.useCase || '')
  const normalizedFallbackUseCase = normalizeText(fallback.useCase || '')
  const normalizedInputFollowUp = normalizeText(input?.followUpQuestion || '')
  const normalizedFallbackFollowUp = normalizeText(fallback.followUpQuestion || '')

  const avoidBrands = sanitizeStringArray(input?.avoidBrands || fallback.avoidBrands || [], 6)
  const preferredBrandsRaw = sanitizeStringArray(input?.preferredBrands || fallback.preferredBrands || [], 6)
  const preferredProductFamilies = sanitizeStringArray(
    input?.preferredProductFamilies || fallback.preferredProductFamilies || [],
    6,
  )
  const preferredBrands = preferredBrandsRaw.filter(
    (brand) => !avoidBrands.some((avoidBrand) => normalizeTextFold(avoidBrand) === normalizeTextFold(brand)),
  )

  const intent = {
    category: normalizedInputCategory || normalizedFallbackCategory,
    budget: {
      min: normalizedBudgetMin ?? fallbackBudgetMin,
      max: normalizedBudgetMax ?? fallbackBudgetMax,
      currency: 'VND',
    },
    useCase: normalizedInputUseCase || normalizedFallbackUseCase,
    priorities: sanitizeStringArray(input?.priorities || fallback.priorities || [], 6),
    preferredBrands,
    preferredProductFamilies,
    avoidBrands,
    needMoreInfo: coerceBoolean(input?.needMoreInfo, false),
    followUpQuestion: normalizedInputFollowUp || normalizedFallbackFollowUp,
  }

  const hasEnoughInfo = Boolean(intent.category && (intent.useCase || intent.budget.max || intent.priorities.length > 0))
  intent.needMoreInfo = intent.needMoreInfo || !hasEnoughInfo

  if (intent.needMoreInfo && !intent.followUpQuestion) {
    intent.followUpQuestion = buildFallbackFollowUp(intent)
  }

  return intent
}

function areCategoriesEquivalent(firstValue = '', secondValue = '') {
  const firstNormalized = normalizeTextFold(firstValue)
  const secondNormalized = normalizeTextFold(secondValue)

  if (!firstNormalized || !secondNormalized) {
    return false
  }

  return (
    firstNormalized === secondNormalized ||
    firstNormalized.includes(secondNormalized) ||
    secondNormalized.includes(firstNormalized)
  )
}

function applyHeuristicOverrides(intent = {}, heuristicIntent = {}) {
  const nextIntent = { ...intent }
  const heuristicCategory = normalizeText(heuristicIntent?.category || '')
  const intentCategory = normalizeText(nextIntent?.category || '')

  // If user explicitly names a category in the latest message, prioritize it.
  if (heuristicCategory && !areCategoriesEquivalent(intentCategory, heuristicCategory)) {
    nextIntent.category = heuristicCategory
  }

  const heuristicBudget = heuristicIntent?.budget && typeof heuristicIntent.budget === 'object' ? heuristicIntent.budget : null
  if (heuristicBudget?.max && Number(heuristicBudget.max) > 0 && !nextIntent?.budget?.max) {
    nextIntent.budget = {
      min: Number.isFinite(Number(heuristicBudget.min)) ? Number(heuristicBudget.min) : nextIntent?.budget?.min ?? null,
      max: Number(heuristicBudget.max),
      currency: 'VND',
    }
  }

  const heuristicUseCase = normalizeText(heuristicIntent?.useCase || '')
  if (heuristicUseCase && !normalizeText(nextIntent?.useCase || '')) {
    nextIntent.useCase = heuristicUseCase
  }

  const heuristicPreferredBrands = sanitizeStringArray(heuristicIntent?.preferredBrands || [], 6)
  if (heuristicPreferredBrands.length > 0) {
    const preferredBrands = sanitizeStringArray(nextIntent?.preferredBrands || [], 6)
    nextIntent.preferredBrands = [...new Set([...preferredBrands, ...heuristicPreferredBrands])]
  }

  return sanitizeIntent(nextIntent, heuristicIntent)
}

function buildIntentPrompt({ message, context, heuristicIntent }) {
  return `
Bạn là AI Intent Analyzer cho trợ lý mua sắm ecommerce Nexora.

Nhiệm vụ:
- Trích xuất intent người dùng thành JSON chính xác theo schema.
- Nếu chưa rõ thông tin, đánh dấu needMoreInfo=true và đặt 1 followUpQuestion ngắn gọn.
- Không viết giải thích, chỉ trả về JSON.
- Ưu tiên viết followUpQuestion bằng tiếng Việt tự nhiên.

Schema:
{
  "category": "string",
  "budget": { "min": number|null, "max": number|null, "currency": "VND" },
  "useCase": "string",
  "priorities": ["string"],
  "preferredBrands": ["string"],
  "avoidBrands": ["string"],
  "needMoreInfo": boolean,
  "followUpQuestion": "string"
}

Ngữ cảnh user:
${JSON.stringify(context || {}, null, 2)}

Câu user:
${String(message || '').trim()}

Gợi ý heuristic:
${JSON.stringify(heuristicIntent, null, 2)}
  `.trim()
}

export async function analyzeShoppingIntent({ message, context = {} }) {
  const heuristicIntent = buildHeuristicIntent(message)

  try {
    const prompt = buildIntentPrompt({ message, context, heuristicIntent })
    const aiIntent = await generateGeminiJson(prompt, { temperature: 0.1 })
    const sanitized = sanitizeIntent(aiIntent, heuristicIntent)
    return applyHeuristicOverrides(sanitized, heuristicIntent)
  } catch {
    return applyHeuristicOverrides(heuristicIntent, heuristicIntent)
  }
}
