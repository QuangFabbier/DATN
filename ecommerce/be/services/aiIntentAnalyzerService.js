import { coerceBoolean, normalizeTextFold, sanitizeStringArray } from './aiJsonUtils.js'
import { generateGeminiJson } from './geminiService.js'

const KNOWN_BRANDS = [
  'apple',
  'dell',
  'asus',
  'hp',
  'lenovo',
  'acer',
  'msi',
  'samsung',
  'xiaomi',
  'logitech',
  'anker',
  'sony',
  'jbl',
  'keychron',
]

const CATEGORY_RULES = [
  { category: 'Laptop', keywords: ['laptop', 'notebook', 'macbook'] },
  { category: 'Dien thoai', keywords: ['dien thoai', 'smartphone', 'iphone', 'galaxy', 'redmi'] },
  { category: 'May tinh bang', keywords: ['tablet', 'ipad', 'may tinh bang'] },
  { category: 'Am thanh', keywords: ['tai nghe', 'loa', 'audio', 'chong on', 'khong day'] },
  { category: 'Man hinh', keywords: ['man hinh', 'monitor', 'display'] },
  { category: 'Phu kien', keywords: ['phu kien', 'chuot', 'ban phim', 'sac du phong', 'cap sac'] },
  { category: 'Noi that', keywords: ['ghe', 'ban', 'den ban', 'noi that'] },
]

const PRIORITY_RULES = [
  { label: 'pin tot', keywords: ['pin', 'thoi luong pin', 'battery', 'pin trau'] },
  { label: 'nhe', keywords: ['nhe', 'mong', 'di dong'] },
  { label: 'hieu nang', keywords: ['hieu nang', 'manh', 'cpu', 'ram'] },
  { label: 'gia tot', keywords: ['re', 'gia tot', 'tiet kiem', 'value'] },
  { label: 'chong on', keywords: ['chong on', 'noise cancelling', 'anc'] },
]

const USE_CASE_RULES = [
  { useCase: 'hoc lap trinh', keywords: ['lap trinh', 'code', 'dev', 'hoc'] },
  { useCase: 'hoc online', keywords: ['hoc online', 'zoom', 'meet', 'hoc tu xa'] },
  { useCase: 'gaming', keywords: ['game', 'gaming', 'fps', 'esports'] },
  { useCase: 'van phong', keywords: ['van phong', 'office', 'lam viec'] },
]

function normalizeText(value = '') {
  return String(value || '').trim()
}

function parseBudgetFromMessage(message = '') {
  const normalized = normalizeTextFold(message)
  const normalizedNoisy = normalized.replace(/\?/g, '')
  const budgetUnitPattern = '(trieu|triu|tr|k|nghin|ngin|vnd|dong)?'
  const underPattern = new RegExp(
    `(?:duoi|dui|khong qua|toi da|under|less than)\\s*(\\d+(?:[.,]\\d+)?)\\s*${budgetUnitPattern}`,
    'i',
  )
  const rangePattern = new RegExp(
    `(?:tu|from)\\s*(\\d+(?:[.,]\\d+)?)\\s*${budgetUnitPattern}\\s*(?:den|-|to)\\s*(\\d+(?:[.,]\\d+)?)\\s*${budgetUnitPattern}`,
    'i',
  )

  const underMatch = normalized.match(underPattern) || normalizedNoisy.match(underPattern)
  const rangeMatch = normalized.match(rangePattern) || normalizedNoisy.match(rangePattern)

  function toVnd(rawValue, rawUnit) {
    const value = Number(String(rawValue || '').replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      return null
    }

    const unit = normalizeTextFold(rawUnit || '')
    if (['trieu', 'tr'].includes(unit)) {
      return Math.round(value * 1_000_000)
    }

    if (['k', 'nghin'].includes(unit)) {
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

  if (rangeMatch) {
    const min = toVnd(rangeMatch[1], rangeMatch[2])
    const max = toVnd(rangeMatch[3], rangeMatch[4])

    return {
      min: min && max ? Math.min(min, max) : min,
      max: min && max ? Math.max(min, max) : max,
      currency: 'VND',
    }
  }

  if (underMatch) {
    return {
      min: null,
      max: toVnd(underMatch[1], underMatch[2]),
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
  return KNOWN_BRANDS.filter((brand) => normalized.includes(brand))
}

function inferAvoidBrands(message = '') {
  const normalized = normalizeTextFold(message)
  const avoidMatches = [...normalized.matchAll(/(?:khong thich|tranh|avoid|khong muon)\s+([a-z0-9\-\s]+)/gi)]

  return avoidMatches
    .flatMap((match) => String(match[1] || '').split(/[\s,]+/g))
    .map((value) => value.trim())
    .filter((value) => KNOWN_BRANDS.includes(value))
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

  const intent = {
    category: normalizedInputCategory || normalizedFallbackCategory,
    budget: {
      min: normalizedBudgetMin ?? fallbackBudgetMin,
      max: normalizedBudgetMax ?? fallbackBudgetMax,
      currency: 'VND',
    },
    useCase: normalizedInputUseCase || normalizedFallbackUseCase,
    priorities: sanitizeStringArray(input?.priorities || fallback.priorities || [], 6),
    preferredBrands: sanitizeStringArray(input?.preferredBrands || fallback.preferredBrands || [], 6),
    avoidBrands: sanitizeStringArray(input?.avoidBrands || fallback.avoidBrands || [], 6),
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

function buildIntentPrompt({ message, context, heuristicIntent }) {
  return `
Bạn là AI Intent Analyzer cho trợ lý mua sắm ecommerce Nexora.

Nhiệm vụ:
- Trích xuất intent người dùng thành JSON CHÍNH XÁC theo schema.
- Nếu không rõ thông tin, đánh dấu needMoreInfo=true và đặt 1 followUpQuestion ngắn gọn.
- Không viết giải thích, chỉ trả về JSON.
- Ưu tiên viết followUpQuestion bằng tiếng Việt có dấu.

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
    return sanitizeIntent(aiIntent, heuristicIntent)
  } catch {
    return sanitizeIntent(heuristicIntent, heuristicIntent)
  }
}
