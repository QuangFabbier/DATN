function normalizeText(value = '') {
  return String(value || '').trim()
}

export function normalizeTextFold(value = '') {
  return normalizeText(value)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isCompareIntent(question = '') {
  const normalizedQuestion = normalizeTextFold(question)
  return normalizedQuestion.includes('so sanh') || normalizedQuestion.includes('compare')
}

function normalizeComparisonCountToken(token = '') {
  const value = normalizeTextFold(token)
  const map = {
    mot: 1,
    hai: 2,
    ba: 3,
    bon: 4,
    tu: 4,
    nam: 5,
    sau: 6,
  }

  if (/^\d+$/.test(value)) {
    return Number(value)
  }

  return map[value] || null
}

export function extractComparisonCount(question = '') {
  const normalizedQuestion = normalizeTextFold(question)
  const directMatch = normalizedQuestion.match(
    /(?:so sanh|compare).*?(\d+|mot|hai|ba|bon|tu|nam|sau)\s*(?:cai|mau|san pham|loai)?/i,
  )

  if (directMatch) {
    const parsed = normalizeComparisonCountToken(directMatch[1])
    if (parsed) {
      return parsed
    }
  }

  const trailingMatch = normalizedQuestion.match(
    /(\d+|mot|hai|ba|bon|tu|nam|sau)\s*(?:cai|mau|san pham|loai)\s*(?:do|nay|tren|nay|nay|nay)?/i,
  )

  if (trailingMatch) {
    const parsed = normalizeComparisonCountToken(trailingMatch[1])
    if (parsed) {
      return parsed
    }
  }

  return null
}

function hasReferenceToPreviousResults(question = '') {
  const normalizedQuestion = normalizeTextFold(question)
  return [
    'cai do',
    'mau do',
    'san pham do',
    'loai do',
    'cai nay',
    'mau nay',
    'san pham nay',
    'loai nay',
    'cai tren',
    'mau tren',
    'san pham tren',
  ].some((keyword) => normalizedQuestion.includes(keyword))
}

function getLastAssistantRecommendedProducts(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return []
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'assistant') {
      continue
    }

    if (Array.isArray(message?.recommendedProducts) && message.recommendedProducts.length > 0) {
      return message.recommendedProducts
        .map((item) => ({
          id: String(item?.id || item?._id || '').trim(),
          name: String(item?.name || '').trim(),
          category: String(item?.category || '').trim(),
          price: Number(item?.price || 0),
          stock: Number(item?.stock || 0),
          image: String(item?.image || '').trim(),
          averageRating: Number(item?.averageRating || 0),
          totalReviews: Number(item?.totalReviews || 0),
        }))
        .filter((item) => item.id && item.name)
    }
  }

  return []
}

function normalizeCompareItems(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      id: String(item?.id || item?._id || '').trim(),
      name: String(item?.name || '').trim(),
      category: String(item?.category || '').trim(),
      price: Number(item?.price || 0),
      stock: Number(item?.stock || 0),
      image: String(item?.image || '').trim(),
      averageRating: Number(item?.averageRating || 0),
      totalReviews: Number(item?.totalReviews || 0),
    }))
    .filter((item) => item.id && item.name)
}

export function resolveCompareCandidates({
  question = '',
  messages = [],
  compareItems = [],
  cartItems = [],
  max = 5,
} = {}) {
  const safeMax = Math.max(2, Math.min(5, Number(max) || 5))
  const requestedCount = extractComparisonCount(question)
  const compareTray = normalizeCompareItems(compareItems)
  const cartTray = normalizeCompareItems(cartItems)
  const lastAssistantRecommendedProducts = getLastAssistantRecommendedProducts(messages)
  const hasPreviousReference = hasReferenceToPreviousResults(question)
  const shouldPreferConversationHistory =
    lastAssistantRecommendedProducts.length >= 2 && (Boolean(requestedCount) || hasPreviousReference)

  if (shouldPreferConversationHistory) {
    return lastAssistantRecommendedProducts.slice(0, Math.min(requestedCount || safeMax, safeMax))
  }

  if (compareTray.length >= 2 && (isCompareIntent(question) || compareTray.length >= requestedCount)) {
    return compareTray.slice(0, Math.min(requestedCount || compareTray.length, safeMax))
  }

  if (cartTray.length >= 2 && /gio|cart/.test(normalizeTextFold(question))) {
    return cartTray.slice(0, Math.min(requestedCount || cartTray.length, safeMax))
  }

  if (lastAssistantRecommendedProducts.length >= 2) {
    return lastAssistantRecommendedProducts.slice(0, Math.min(requestedCount || safeMax, safeMax))
  }

  if (compareTray.length >= 2) {
    return compareTray.slice(0, Math.min(requestedCount || compareTray.length, safeMax))
  }

  if (cartTray.length >= 2) {
    return cartTray.slice(0, Math.min(requestedCount || cartTray.length, safeMax))
  }

  return []
}

function pickProductName(compareResult, pick = { productId: '' }) {
  const matched = Array.isArray(compareResult?.comparedProducts)
    ? compareResult.comparedProducts.find((item) => item.id === pick.productId)
    : null
  return matched ? matched.name : ''
}

export function formatCompareAssistantMessage(compareResult = {}) {
  const summary = String(compareResult?.summary || '').trim()
  const bestForStudyName = pickProductName(compareResult, compareResult?.bestForStudy)
  const bestForGamingName = pickProductName(compareResult, compareResult?.bestForGaming)
  const bestValueName = pickProductName(compareResult, compareResult?.bestValue)
  const bestChoiceName = bestValueName || bestForGamingName || bestForStudyName || 'một trong các mẫu đã so sánh'

  const whyLines = [
    compareResult?.bestValue?.reason ? `- Giá trị tốt: ${compareResult.bestValue.reason}` : '',
    compareResult?.bestForGaming?.reason ? `- Nếu ưu tiên hiệu năng: ${compareResult.bestForGaming.reason}` : '',
    compareResult?.bestForStudy?.reason ? `- Nếu ưu tiên học tập: ${compareResult.bestForStudy.reason}` : '',
  ].filter(Boolean)

  const notBuyLines = [
    compareResult?.bestForStudy?.reason && /chua|thieu|chua du|khong/.test(normalizeTextFold(compareResult.bestForStudy.reason))
      ? `- Không nên mua mẫu này nếu bạn cần đầy đủ hơn về hiệu năng/giá trị.`
      : '',
    compareResult?.bestForGaming?.reason && /chua|thieu|chua du|khong/.test(normalizeTextFold(compareResult.bestForGaming.reason))
      ? `- Không nên mua mẫu này nếu bạn ưu tiên gaming mạnh.`
      : '',
    compareResult?.bestValue?.reason && /chua|thieu|chua du|khong/.test(normalizeTextFold(compareResult.bestValue.reason))
      ? `- Không nên mua mẫu này nếu bạn muốn giá trị cân bằng hơn.`
      : '',
  ].filter(Boolean)

  return [
    `Tóm tắt: ${summary || 'Mình đã so sánh nhanh các mẫu bạn đưa ra.'}`,
    `Mẫu nên chọn: ${bestChoiceName}`,
    `Vì sao:
${whyLines.length > 0 ? whyLines.join('\n') : '- Mẫu này đang cân bằng nhất theo dữ liệu hiện có.'}`,
    `Khi nào không nên mua:
${notBuyLines.length > 0 ? notBuyLines.join('\n') : '- Không nên mua nếu ngân sách của bạn thấp hơn hoặc bạn cần tiêu chí khác hẳn so với nhu cầu hiện tại.'}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
