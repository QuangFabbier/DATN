import { analyzeShoppingIntent } from '../services/aiIntentAnalyzerService.js'
import { compareProductsWithAi } from '../services/aiCompareService.js'
import { analyzeCartWithAi, explainProductWithAi } from '../services/aiProductService.js'
import { buildRecommendationExplanation } from '../services/aiRecommendationService.js'
import {
  buildClarificationPayload,
  mergeConversationContext,
  normalizeConversationContext,
  updateRecommendedProductsInContext,
} from '../services/conversationStateService.js'
import { buildInventoryInsights } from '../services/inventoryAiService.js'
import { mapProductForResponse, matchProductsByIntent } from '../services/productMatchingService.js'

function normalizeContext(context) {
  return context && typeof context === 'object' ? context : {}
}

function normalizeRecentMessages(messages = []) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages
    .slice(-8)
    .map((item) => ({
      role: item?.role === 'user' ? 'user' : 'assistant',
      content: String(item?.content || '').trim().slice(0, 320),
    }))
    .filter((item) => item.content)
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
    const conversationContext = normalizeConversationContext(
      req.body?.conversationContext || req.body?.context?.conversationContext || {},
    )
    const context = {
      ...normalizeContext(req.body?.context),
      conversationContext,
      recentMessages: normalizeRecentMessages(req.body?.recentMessages),
      conversationSummary: String(req.body?.conversationSummary || '').trim().slice(0, 420),
    }

    if (!message) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung cần tư vấn.' })
    }

    const intent = await analyzeShoppingIntent({ message, context })
    const mergedConversationContext = mergeConversationContext({
      baseContext: conversationContext,
      intent,
      message,
      auxiliaryContext: context,
    })
    const effectiveIntent = {
      ...intent,
      queryText: message,
      category: mergedConversationContext.category || intent.category,
      budget: mergedConversationContext.budget || intent.budget,
      useCase: mergedConversationContext.useCase || intent.useCase,
      priorities: Array.isArray(mergedConversationContext.priorities)
        ? mergedConversationContext.priorities
        : intent.priorities,
      preferredBrands: Array.isArray(mergedConversationContext.preferredBrands)
        ? mergedConversationContext.preferredBrands
        : intent.preferredBrands,
      preferredProductFamilies: Array.isArray(mergedConversationContext.preferredProductFamilies)
        ? mergedConversationContext.preferredProductFamilies
        : intent.preferredProductFamilies,
      avoidBrands: Array.isArray(mergedConversationContext.avoidBrands)
        ? mergedConversationContext.avoidBrands
        : intent.avoidBrands,
    }

    // Ask clarification first when category is still missing to avoid irrelevant recommendations.
    if (intent?.needMoreInfo && !effectiveIntent?.category) {
      const clarification = buildClarificationPayload(mergedConversationContext)
      return res.json({
        ...clarification,
        intent: effectiveIntent,
        conversationContext: mergedConversationContext,
        recommendedProducts: [],
        needMoreInfo: true,
        followUpQuestion: clarification.followUpQuestion || intent.followUpQuestion || '',
      })
    }

    const matching = await matchProductsByIntent(effectiveIntent, { limit: 5 })
    const topProducts = matching.matches.map((item) => mapProductForResponse(item.product))

    if (topProducts.length === 0) {
      const nextConversationContext = updateRecommendedProductsInContext(mergedConversationContext, [])
      return res.json({
        reply: buildNoMatchReply(effectiveIntent),
        intent: effectiveIntent,
        conversationContext: nextConversationContext,
        recommendedProducts: [],
        needMoreInfo: Boolean(intent?.needMoreInfo),
        followUpQuestion: intent.followUpQuestion || '',
      })
    }

    const recommendation = await buildRecommendationExplanation({
      message,
      intent: effectiveIntent,
      topProducts,
    })

    const needMoreInfo = Boolean(recommendation.needMoreInfo)
    const followUpQuestion = recommendation.followUpQuestion || ''
    const nextConversationContext = updateRecommendedProductsInContext(mergedConversationContext, topProducts)

    return res.json({
      reply: recommendation.reply || buildNoMatchReply(effectiveIntent),
      intent: effectiveIntent,
      conversationContext: nextConversationContext,
      recommendedProducts: topProducts,
      bestProductId: recommendation.bestProductId || '',
      needMoreInfo,
      followUpQuestion,
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

export async function explainProductWithAiHandler(req, res) {
  try {
    const productId = String(req.body?.productId || '').trim()
    const question = String(req.body?.question || '').trim()

    if (!productId) {
      return res.status(400).json({ message: 'Thiếu productId để phân tích sản phẩm.' })
    }

    const result = await explainProductWithAi({ productId, question })
    return res.json(result)
  } catch (error) {
    const statusCode = error.statusCode || 500
    return res.status(statusCode).json({
      message:
        statusCode >= 500
          ? 'Không thể phân tích sản phẩm bằng AI lúc này. Vui lòng thử lại sau.'
          : error.message || 'Yêu cầu phân tích sản phẩm không hợp lệ.',
    })
  }
}

export async function analyzeCartWithAiHandler(req, res) {
  try {
    const cartItems = Array.isArray(req.body?.cartItems) ? req.body.cartItems : []
    const userNeed = String(req.body?.userNeed || '').trim()

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng đang trống, chưa thể phân tích.' })
    }

    const result = await analyzeCartWithAi({ cartItems, userNeed })
    return res.json(result)
  } catch (error) {
    const statusCode = error.statusCode || 500
    return res.status(statusCode).json({
      message:
        statusCode >= 500
          ? 'Không thể phân tích giỏ hàng bằng AI lúc này. Vui lòng thử lại sau.'
          : error.message || 'Yêu cầu phân tích giỏ hàng không hợp lệ.',
    })
  }
}

export async function getInventoryInsightsHandler(req, res) {
  try {
    const result = await buildInventoryInsights({
      userId: req.user?.id || '',
      role: req.user?.role || '',
      query: req.query || {},
    })

    return res.json(result)
  } catch (error) {
    const statusCode = error.statusCode || 500
    return res.status(statusCode).json({
      message:
        statusCode >= 500
          ? 'Không thể tạo gợi ý inventory bằng AI lúc này. Vui lòng thử lại sau.'
          : error.message || 'Yêu cầu inventory AI không hợp lệ.',
    })
  }
}
