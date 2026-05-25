import { analyzeShoppingIntent } from '../services/aiIntentAnalyzerService.js'
import { compareProductsWithAi } from '../services/aiCompareService.js'
import { buildRecommendationExplanation } from '../services/aiRecommendationService.js'
import { mapProductForResponse, matchProductsByIntent } from '../services/productMatchingService.js'

function normalizeContext(context) {
  return context && typeof context === 'object' ? context : {}
}

function buildNoMatchReply(intent) {
  if (intent?.needMoreInfo && intent?.followUpQuestion) {
    return `Mình cần thêm thông tin để lọc chính xác. ${intent.followUpQuestion}`
  }

  return 'Mình chưa tìm thấy sản phẩm phù hợp trong kho hiện tại. Bạn có thể mở rộng ngân sách hoặc thay đổi ưu tiên để mình lọc lại.'
}

export async function chatWithAi(req, res) {
  try {
    const message = String(req.body?.message || '').trim()
    const context = normalizeContext(req.body?.context)

    if (!message) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung cần tư vấn.' })
    }

    const intent = await analyzeShoppingIntent({ message, context })
    const matching = await matchProductsByIntent(intent, { limit: 5 })

    const topProducts = matching.matches.map((item) => mapProductForResponse(item.product))

    if (topProducts.length === 0) {
      return res.json({
        reply: buildNoMatchReply(intent),
        intent,
        recommendedProducts: [],
        followUpQuestion: intent.followUpQuestion || '',
      })
    }

    const recommendation = await buildRecommendationExplanation({
      message,
      intent,
      topProducts,
    })

    return res.json({
      reply: recommendation.reply || buildNoMatchReply(intent),
      intent,
      recommendedProducts: topProducts,
      bestProductId: recommendation.bestProductId || '',
      needMoreInfo: Boolean(recommendation.needMoreInfo),
      followUpQuestion: recommendation.followUpQuestion || '',
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      message:
        statusCode >= 500
          ? 'Không thể xử lý tư vấn AI lúc này. Vui lòng thử lại sau.'
          : error.message || 'Yêu cầu tư vấn không hợp lệ.',
    })
  }
}

export async function compareWithAi(req, res) {
  try {
    const result = await compareProductsWithAi({
      productIds: req.body?.productIds,
      products: req.body?.products,
      focus: req.body?.focus,
    })

    return res.json(result)
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      message:
        statusCode >= 500
          ? 'Không thể xử lý so sánh AI lúc này. Vui lòng thử lại sau.'
          : error.message || 'Yêu cầu so sánh không hợp lệ.',
    })
  }
}
