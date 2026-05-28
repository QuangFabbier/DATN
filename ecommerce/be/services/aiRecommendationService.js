import { generateGeminiJson } from './geminiService.js'

function normalizeText(value = '') {
  return String(value || '').trim()
}

function toGeminiProductBrief(product = {}) {
  return {
    id: String(product?.id || product?._id || '').trim(),
    name: normalizeText(product?.name),
    brand: normalizeText(product?.brand),
    category: normalizeText(product?.category),
    price: Number(product?.price || 0),
    specs: Array.isArray(product?.specs)
      ? product.specs
          .map((spec) => `${normalizeText(spec?.label)}: ${normalizeText(spec?.value)}`.trim())
          .filter(Boolean)
          .slice(0, 6)
      : [],
    description: normalizeText(product?.description).slice(0, 220),
  }
}

function buildRecommendationPrompt({ message, intent, topProducts }) {
  const geminiProducts = Array.isArray(topProducts) ? topProducts.slice(0, 5).map(toGeminiProductBrief) : []

  return `
Bạn là AI Shopping Assistant của Nexora.
Chỉ được tư vấn dựa trên danh sách sản phẩm đã cung cấp.

Mục tiêu trả lời:
- Ngắn gọn, tự nhiên, như tư vấn viên bán hàng thật.
- Ưu tiên bám sát nhu cầu, ngân sách, mục đích sử dụng.
- Nếu còn thiếu dữ liệu, hỏi đúng 1 câu ngắn để làm rõ.

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

Intent hiện tại:
${JSON.stringify(intent, null, 2)}

Tin nhắn người dùng:
${normalizeText(message)}

Danh sách sản phẩm đã lọc relevance:
${JSON.stringify(geminiProducts, null, 2)}
  `.trim()
}

function buildFallbackReply(intent, topProducts) {
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

  const reply =
    intent?.needMoreInfo && intent?.followUpQuestion
      ? `Mình đã lọc tạm theo thông tin hiện có và thấy ${shortlist} là những lựa chọn nổi bật. Trước khi chốt, ${intent.followUpQuestion.toLowerCase()}`
      : `Mình đã lọc theo nhu cầu của bạn và chọn nhanh 3 mẫu phù hợp: ${shortlist}. Nếu cần chốt một mẫu cân bằng nhất lúc này thì mình nghiêng về ${topOne.name}.`

  return {
    reply,
    bestProductId: intent?.needMoreInfo ? '' : String(topOne.id || ''),
    needMoreInfo: Boolean(intent?.needMoreInfo),
    followUpQuestion: intent?.needMoreInfo ? String(intent?.followUpQuestion || '') : '',
  }
}

export async function buildRecommendationExplanation({ message, intent, topProducts }) {
  const fallback = buildFallbackReply(intent, topProducts)

  if (!Array.isArray(topProducts) || topProducts.length === 0) {
    return fallback
  }

  try {
    const prompt = buildRecommendationPrompt({ message, intent, topProducts })
    const aiJson = await generateGeminiJson(prompt, { temperature: 0.12, route: 'chat.recommendation' })

    return {
      reply: normalizeText(aiJson?.reply || fallback.reply) || fallback.reply,
      bestProductId: normalizeText(aiJson?.bestProductId || fallback.bestProductId),
      needMoreInfo: typeof aiJson?.needMoreInfo === 'boolean' ? aiJson.needMoreInfo : fallback.needMoreInfo,
      followUpQuestion: normalizeText(aiJson?.followUpQuestion || fallback.followUpQuestion),
    }
  } catch {
    return fallback
  }
}
