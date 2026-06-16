import { normalizeTextFold } from './aiJsonUtils.js'

function normalizeText(value = '') {
  return String(value || '').trim()
}

function fold(value = '') {
  return normalizeTextFold(value)
}

const USE_CASE_PROFILES = {
  study: {
    label: 'học tập',
    keywords: ['hoc tap', 'hoc lap trinh', 'hoc online', 'sinh vien', 'ghi chu', 'on thi', 'study', 'school'],
    positiveTerms: ['ram', 'ssd', 'cpu', 'i3', 'i5', 'i7', 'ryzen 3', 'ryzen 5', 'ryzen 7', 'pin', 'battery', 'nhe', 'mong', 'full hd', 'oled', 'keyboard'],
    negativeTerms: ['gaming', 'rtx', 'gtx', 'high refresh', 'mechanical'],
    categoryHints: ['laptop', 'tablet'],
    summary: 'phù hợp cho học tập nếu ưu tiên cấu hình cân bằng, pin và tính di động',
  },
  gaming: {
    label: 'gaming',
    keywords: ['gaming', 'game', 'fps', 'esports', 'choi game', 'stream'],
    positiveTerms: ['rtx', 'gtx', 'radeon', 'gpu', 'vga', 'i7', 'ryzen 7', 'ryzen 9', '16gb', '32gb', 'high refresh', 'cooling', 'tản nhiệt', 'keyboard', 'mechanical', 'switch', 'rgb', 'anti ghosting', 'low latency', 'rapid trigger'],
    negativeTerms: ['pin yếu', 'mỏng nhẹ', 'siêu tiết kiệm điện'],
    categoryHints: ['laptop', 'desktop', 'pc', 'monitor', 'keyboard'],
    summary: 'hợp gaming nếu ưu tiên GPU, tản nhiệt, màn hình mượt và RAM đủ mạnh',
  },
  photography: {
    label: 'chụp ảnh',
    keywords: ['chup anh', 'camera', 'photo', 'photography', 'portra', 'selfie', 'quay video', 'video', 'chup hinh'],
    positiveTerms: ['camera', 'ois', 'zoom', 'night', 'portrait', 'ultra wide', 'tele', 'mp', 'lens', 'ai photo', 'stabilization'],
    negativeTerms: ['camera phụ', 'không có ois'],
    categoryHints: ['phone', 'camera', 'smartphone', 'tablet'],
    summary: 'hợp chụp ảnh nếu ưu tiên camera, chống rung, zoom và xử lý ảnh',
  },
  battery: {
    label: 'pin',
    keywords: ['pin', 'battery', 'sac nhanh', 'fast charge', 'power bank', 'di dong', 'travel', 'du lich'],
    positiveTerms: ['pin', 'battery', 'mAh', 'mah', 'fast charging', 'super fast charging', 'quick charge', 'light', 'nhe'],
    negativeTerms: ['hao pin'],
    categoryHints: ['phone', 'tablet', 'laptop', 'smartwatch', 'power bank'],
    summary: 'hợp nhu cầu pin nếu ưu tiên thời lượng dùng dài và sạc nhanh',
  },
  office: {
    label: 'văn phòng',
    keywords: ['van phong', 'office', 'lam viec', 'hop dong', 'email', 'excel', 'word'],
    positiveTerms: ['webcam', 'mic', 'battery', 'light', 'nhe', '14', '15.6', 'oled', 'full hd', 'silent', 'ergonomic', 'full size'],
    negativeTerms: ['gaming', 'rtx', 'mechanical'],
    categoryHints: ['laptop', 'tablet', 'monitor'],
    summary: 'hợp văn phòng nếu ưu tiên gọn nhẹ, pin ổn, màn hình dễ nhìn và gõ thoải mái',
  },
  compact: {
    label: 'gọn nhẹ',
    keywords: ['gon nhe', 'di dong', 'travel', 'cong tac', 'mang theo', 'portable'],
    positiveTerms: ['nhe', 'mong', 'thin', 'compact', 'battery', 'light', '13', '14', 'keyboard', 'tenkeyless', 'mini', '60%', '65%', '75%'],
    negativeTerms: ['cồng kềnh'],
    categoryHints: ['laptop', 'tablet', 'phone', 'smartwatch', 'keyboard'],
    summary: 'hợp di chuyển nếu ưu tiên trọng lượng nhẹ và sự linh hoạt',
  },
}

function getProductSearchText(product = {}) {
  const specText = Array.isArray(product.specs)
    ? product.specs
        .map((spec) => `${normalizeText(spec?.label)} ${normalizeText(spec?.value)}`.trim())
        .join(' ')
    : ''

  return fold(
    [
      product?.name,
      product?.category,
      product?.brand,
      product?.description,
      Array.isArray(product?.tags) ? product.tags.join(' ') : '',
      Array.isArray(product?.useCases) ? product.useCases.join(' ') : '',
      specText,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function resolveUseCaseProfile(intent = {}, message = '') {
  const haystack = fold([intent?.useCase, intent?.priorities?.join(' '), message].filter(Boolean).join(' '))
  const matched = Object.entries(USE_CASE_PROFILES).find(([, profile]) =>
    profile.keywords.some((keyword) => haystack.includes(fold(keyword))),
  )

  return matched ? matched[0] : ''
}

function scoreFromProfile(product = {}, profileKey = '') {
  const profile = USE_CASE_PROFILES[profileKey]
  if (!profile) {
    return { score: 0, reasons: [] }
  }

  const searchText = getProductSearchText(product)
  let score = 0
  const reasons = []

  const category = fold(product?.category || '')
  if (profile.categoryHints.some((hint) => category.includes(fold(hint)))) {
    score += 24
    reasons.push(`đúng nhóm ${profile.label}`)
  }

  const positiveHits = profile.positiveTerms.filter((term) => searchText.includes(fold(term)))
  if (positiveHits.length > 0) {
    score += Math.min(48, positiveHits.length * 8)
    reasons.push(`có tín hiệu ${positiveHits.slice(0, 3).join(', ')}`)
  }

  const negativeHits = profile.negativeTerms.filter((term) => searchText.includes(fold(term)))
  if (negativeHits.length > 0) {
    score -= Math.min(24, negativeHits.length * 8)
    reasons.push(`bị lệch sang ${negativeHits.slice(0, 2).join(', ')}`)
  }

  const normalizedScore = Math.max(0, Math.min(100, score))
  return {
    score: normalizedScore,
    reasons: [...new Set(reasons)].slice(0, 4),
  }
}

export function isStudyIntent(intent = {}, message = '') {
  return resolveUseCaseProfile(intent, message) === 'study'
}

export function isGamingIntent(intent = {}, message = '') {
  return resolveUseCaseProfile(intent, message) === 'gaming'
}

export function isPhotographyIntent(intent = {}, message = '') {
  return resolveUseCaseProfile(intent, message) === 'photography'
}

export function isBatteryIntent(intent = {}, message = '') {
  return resolveUseCaseProfile(intent, message) === 'battery'
}

export function isOfficeIntent(intent = {}, message = '') {
  return resolveUseCaseProfile(intent, message) === 'office'
}

export function detectUseCaseProfile(intent = {}, message = '') {
  return resolveUseCaseProfile(intent, message)
}

export function scoreUseCaseFit(product = {}, profileKey = 'study') {
  return scoreFromProfile(product, profileKey)
}

export function buildUseCaseFitText(product = {}, profileKey = 'study') {
  const profile = USE_CASE_PROFILES[profileKey] || USE_CASE_PROFILES.study
  const fit = scoreUseCaseFit(product, profileKey)

  if (fit.score >= 60) {
    return fit.reasons.length > 0
      ? `Rất phù hợp cho ${profile.label} vì ${fit.reasons.join(', ')}.`
      : `Rất phù hợp cho ${profile.label} nhờ cấu hình và nhóm sản phẩm cân đối.`
  }

  if (fit.score >= 35) {
    return fit.reasons.length > 0
      ? `Phù hợp cho ${profile.label} nếu bạn ưu tiên ${fit.reasons.join(', ')}.`
      : `Phù hợp cho ${profile.label} cơ bản nếu bạn cần một lựa chọn cân bằng.`
  }

  return fit.reasons.length > 0
    ? `Không phải lựa chọn ưu tiên cho ${profile.label} vì ${fit.reasons.join(', ')}.`
    : `Không phải lựa chọn ưu tiên nếu mục tiêu chính là ${profile.label}.`
}

export function buildUseCaseFitTexts(product = {}) {
  return {
    study: buildUseCaseFitText(product, 'study'),
    gaming: buildUseCaseFitText(product, 'gaming'),
    photography: buildUseCaseFitText(product, 'photography'),
    battery: buildUseCaseFitText(product, 'battery'),
    office: buildUseCaseFitText(product, 'office'),
    compact: buildUseCaseFitText(product, 'compact'),
  }
}

export function resolveBestUseCaseProfile(product = {}, intent = {}, message = '') {
  const explicitProfile = resolveUseCaseProfile(intent, message)
  if (explicitProfile) {
    return explicitProfile
  }

  const scoredProfiles = Object.keys(USE_CASE_PROFILES)
    .map((profileKey) => ({
      profileKey,
      score: scoreUseCaseFit(product, profileKey).score,
    }))
    .sort((first, second) => second.score - first.score || first.profileKey.localeCompare(second.profileKey))

  return scoredProfiles[0]?.profileKey || 'study'
}
