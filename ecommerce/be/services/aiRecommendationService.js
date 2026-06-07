import { generateGeminiJson } from './geminiService.js'
import { normalizeTextFold } from './aiJsonUtils.js'

function normalizeText(value = '') {
  return String(value || '').trim()
}

function isWhyQuestion(message = '') {
  const normalizedMessage = normalizeTextFold(message)
  return ['tai sao', 'vi sao', 'why', 'ly do', 'giai thich'].some((keyword) => normalizedMessage.includes(keyword))
}

function toGeminiProductBrief(product = {}) {
  return {
    id: String(product?.id || product?._id || '').trim(),
    name: normalizeText(product?.name),
    brand: normalizeText(product?.brand),
    category: normalizeText(product?.category),
    price: Number(product?.price || 0),
    averageRating: Number(product?.averageRating || 0),
    totalReviews: Number(product?.totalReviews || 0),
    reviewSummary: normalizeText(product?.reviewSummary?.text || ''),
    specs: Array.isArray(product?.specs)
      ? product.specs
          .map((spec) => `${normalizeText(spec?.label)}: ${normalizeText(spec?.value)}`.trim())
          .filter(Boolean)
          .slice(0, 6)
      : [],
    description: normalizeText(product?.description).slice(0, 220),
  }
}

function buildProductReasons(product = {}, intent = {}) {
  const reasons = []
  const productPrice = Number(product?.price || 0)
  const productStock = Number(product?.stock || 0)
  const averageRating = Number(product?.averageRating || 0)
  const totalReviews = Number(product?.totalReviews || 0)
  const description = normalizeText(product?.description)
  const specs = Array.isArray(product?.specs)
    ? product.specs
        .map((spec) => `${normalizeText(spec?.label)} ${normalizeText(spec?.value)}`.trim())
        .filter(Boolean)
    : []

  if (Number.isFinite(productPrice) && productPrice > 0) {
    if (Number.isFinite(Number(intent?.budget?.max)) && productPrice <= Number(intent.budget.max)) {
      reasons.push('giá nằm trong ngân sách hiện tại')
    } else {
      reasons.push('giá đang cân bằng trong nhóm sản phẩm này')
    }
  }

  if (productStock > 0) {
    reasons.push(`còn hàng ${productStock}`)
  }

  if (averageRating > 0 && totalReviews > 0) {
    reasons.push(`đánh giá ${averageRating.toFixed(1)}/5 từ ${totalReviews} lượt`)
  }

  if (normalizeText(intent?.useCase) && description) {
    const descriptionFold = normalizeTextFold(description)
    const useCaseFold = normalizeTextFold(intent.useCase)
    if (descriptionFold.includes(useCaseFold)) {
      reasons.push(`mô tả khớp nhu cầu ${intent.useCase}`)
    }
  }

  if (specs.length > 0) {
    reasons.push(`thông số nổi bật: ${specs.slice(0, 2).join(', ')}`)
  }

  if (normalizeText(product?.category)) {
    reasons.push(`đúng nhóm ${product.category}`)
  }

  return [...new Set(reasons)].slice(0, 3)
}

function buildRecommendationPrompt({ message, intent, topProducts }) {
  const geminiProducts = Array.isArray(topProducts) ? topProducts.slice(0, 5).map(toGeminiProductBrief) : []
  const whyFocus = isWhyQuestion(message)

  return `
Bạn là AI Shopping Assistant của Nexora.
Chỉ được tư vấn dựa trên danh sách sản phẩm đã cung cấp.

Mục tiêu trả lời:
- Ngắn gọn, tự nhiên, như tư vấn viên bán hàng thật.
- Ưu tiên bám sát nhu cầu, ngân sách, mục đích sử dụng.
- Nếu còn thiếu dữ liệu, hỏi đúng 1 câu ngắn để làm rõ.
- Tất cả câu trả lời phải viết bằng tiếng Việt có dấu đầy đủ.
- Nếu câu người dùng hỏi "tại sao", "vì sao", "why" hoặc "lý do", bắt buộc giải thích ngắn gọn lý do chọn sản phẩm, không chỉ liệt kê tên sản phẩm.

Bắt buộc trả về JSON hợp lệ:
{
  "reply": "string",
  "bestProductId": "string|''",
  "needMoreInfo": boolean,
  "followUpQuestion": "string"
}

Quy tắc nội dung:
- reply tối đa 4 câu.
- Nếu needMoreInfo=true thì bestProductId để rỗng.
- Không đề xuất sản phẩm ngoài danh sách bên dưới.
- Ưu tiên sản phẩm có rating cao hơn khi các tiêu chí khác gần tương đương.
- Nếu sản phẩm có rating thấp hoặc reviewSummary có điểm trừ, phải nói trung thực và không được lảng tránh.
- Khi trả lời câu hỏi "tại sao", câu trả lời phải có ít nhất 2 lý do cụ thể như giá, hiệu năng, pin, đánh giá, thông số, hoặc mức độ khớp nhu cầu.

Intent hiện tại:
${JSON.stringify(intent, null, 2)}

Câu hỏi có đang hỏi lý do không:
${whyFocus ? 'true' : 'false'}

Tin nhắn người dùng:
${normalizeText(message)}

Danh sách sản phẩm đã lọc relevance:
${JSON.stringify(geminiProducts, null, 2)}
  `.trim()
}

function buildFallbackReply(intent, topProducts, message = '') {
  if (!Array.isArray(topProducts) || topProducts.length === 0) {
    return {
      reply: 'Hiện mình chưa thấy mẫu thật sự phù hợp trong kho theo tiêu chí hiện tại.',
      bestProductId: '',
      needMoreInfo: true,
      followUpQuestion: 'Bạn muốn nới ngân sách nhẹ hoặc đổi ưu tiên chính để mình lọc lại không?',
    }
  }

  const topOne = topProducts[0]
  const shortlist = topProducts
    .slice(0, 3)
    .map((product) => product.name)
    .join(', ')
  const whyFocus = isWhyQuestion(message)
  const reasons = buildProductReasons(topOne, intent)

  const reply = whyFocus
    ? `Mình nghiêng về ${topOne.name} vì ${reasons.join(', ') || 'đây là lựa chọn cân bằng nhất trong nhóm hiện tại'}. Các mẫu còn lại trong shortlist vẫn ổn, nhưng ${topOne.name} phù hợp hơn theo tiêu chí bạn đang hỏi.`
    : intent?.needMoreInfo && intent?.followUpQuestion
      ? `Mình đã lọc tạm theo thông tin hiện có và thấy ${shortlist} là những lựa chọn nổi bật. Trước khi chốt, ${intent.followUpQuestion.toLowerCase()}`
      : `Mình đã lọc theo nhu cầu của bạn và chọn nhanh 3 mẫu phù hợp: ${shortlist}. Nếu cần chốt một mẫu cân bằng nhất lúc này thì mình nghiêng về ${topOne.name}.`

  return {
    reply,
    bestProductId: whyFocus || !intent?.needMoreInfo ? String(topOne.id || '') : '',
    needMoreInfo: whyFocus ? false : Boolean(intent?.needMoreInfo),
    followUpQuestion: whyFocus ? '' : intent?.needMoreInfo ? String(intent?.followUpQuestion || '') : '',
  }
}

export async function buildRecommendationExplanation({ message, intent, topProducts }) {
  const fallback = buildFallbackReply(intent, topProducts, message)

  if (!Array.isArray(topProducts) || topProducts.length === 0) {
    return fallback
  }

  try {
    const prompt = buildRecommendationPrompt({ message, intent, topProducts })
    const aiJson = await generateGeminiJson(prompt, { temperature: 0.12, route: 'chat.recommendation' })
    const whyFocus = isWhyQuestion(message)
    const replyFromAi = normalizeText(aiJson?.reply || fallback.reply)
    const fallbackReasons = whyFocus ? buildProductReasons(topProducts[0], intent) : []
    const normalizedReply = normalizeTextFold(replyFromAi)
    const hasReasonMarker =
      normalizedReply.includes('vi sao') ||
      normalizedReply.includes('ly do') ||
      normalizedReply.includes('vì sao') ||
      normalizedReply.includes('vì')

    const reply =
      whyFocus && !hasReasonMarker
        ? `${replyFromAi} ${fallbackReasons.length > 0 ? `Lý do chính: ${fallbackReasons.join(', ')}.` : ''}`.trim()
        : replyFromAi || fallback.reply

    return {
      reply: reply || fallback.reply,
      bestProductId: normalizeText(aiJson?.bestProductId || fallback.bestProductId),
      needMoreInfo: whyFocus ? false : typeof aiJson?.needMoreInfo === 'boolean' ? aiJson.needMoreInfo : fallback.needMoreInfo,
      followUpQuestion: whyFocus ? '' : normalizeText(aiJson?.followUpQuestion || fallback.followUpQuestion),
    }
  } catch {
    return fallback
  }
}
