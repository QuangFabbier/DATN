import { generateGeminiJson } from './geminiService.js'

function normalizeText(value = '') {
  return String(value || '').trim()
}

function buildRecommendationPrompt({ message, intent, topProducts }) {
  return `
Bạn là AI Shopping Assistant của Nexora. Chỉ được dùng danh sách sản phẩm backend đã chọn.

Mục tiêu:
- Tư vấn bằng tiếng Việt có dấu, ngắn gọn, rõ ràng.
- Trình bày đã hiểu nhu cầu, tiêu chí, lý do chọn từng sản phẩm.
- Chỉ ra 1 sản phẩm phù hợp nhất.
- Nếu thiếu thông tin, hỏi thêm 1 câu ngắn.
- Không được đề xuất sản phẩm ngoài danh sách.

Bắt buộc trả về JSON hợp lệ:
{
  "reply": "string",
  "bestProductId": "string|''",
  "needMoreInfo": boolean,
  "followUpQuestion": "string"
}

Intent:
${JSON.stringify(intent, null, 2)}

Câu user:
${normalizeText(message)}

Top products:
${JSON.stringify(topProducts, null, 2)}
  `.trim()
}

function buildFallbackReply(intent, topProducts) {
  if (!Array.isArray(topProducts) || topProducts.length === 0) {
    return {
      reply: 'Hiện chưa có sản phẩm phù hợp trong kho. Bạn có thể nới rộng tiêu chí hoặc ngân sách để mình lọc lại.',
      bestProductId: '',
      needMoreInfo: true,
      followUpQuestion: 'Bạn có thể cho mình biết thêm nhu cầu ưu tiên nhất không?',
    }
  }

  const topOne = topProducts[0]
  const priorities = Array.isArray(intent?.priorities) && intent.priorities.length > 0
    ? intent.priorities.join(', ')
    : 'hiệu năng và độ phù hợp nhu cầu'

  return {
    reply: `Mình đã phân tích nhu cầu và ưu tiên ${priorities}. ${topProducts
      .map((product, index) => `${index + 1}) ${product.name}`)
      .join(', ')} là các lựa chọn phù hợp trong kho. Lựa chọn cân bằng nhất hiện tại là ${topOne.name}. Bạn muốn mình so sánh kỹ hơn giữa các mẫu này không?`,
    bestProductId: String(topOne.id || ''),
    needMoreInfo: false,
    followUpQuestion: '',
  }
}

export async function buildRecommendationExplanation({ message, intent, topProducts }) {
  const fallback = buildFallbackReply(intent, topProducts)

  if (!Array.isArray(topProducts) || topProducts.length === 0) {
    return fallback
  }

  try {
    const prompt = buildRecommendationPrompt({ message, intent, topProducts })
    const aiJson = await generateGeminiJson(prompt, { temperature: 0.2 })

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
