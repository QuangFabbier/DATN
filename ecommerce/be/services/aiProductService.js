import mongoose from 'mongoose'
import Product from '../models/Product.js'
import { generateGeminiJson } from './geminiService.js'
import { mapProductForResponse } from './productMatchingService.js'
import { normalizeTextFold } from './aiJsonUtils.js'

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeId(value = '') {
  return String(value || '').trim()
}

function toCompactProduct(product = {}) {
  const mapped = mapProductForResponse(product)
  return {
    id: mapped.id,
    name: mapped.name,
    brand: mapped.brand,
    category: mapped.category,
    description: mapped.description,
    price: mapped.price,
    stock: mapped.stock,
    specs: Array.isArray(mapped.specs) ? mapped.specs.slice(0, 12) : [],
    tags: Array.isArray(mapped.tags) ? mapped.tags.slice(0, 12) : [],
    useCases: Array.isArray(mapped.useCases) ? mapped.useCases.slice(0, 8) : [],
    image: mapped.image,
  }
}

function toGeminiProductBrief(product = {}) {
  return {
    id: normalizeId(product?.id || product?._id),
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

async function getProductByIdOrThrow(productId) {
  const normalizedId = normalizeId(productId)
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
    const error = new Error('productId không hợp lệ.')
    error.statusCode = 400
    throw error
  }

  const product = await Product.findById(normalizedId)
    .select('name category brand description price stock image specs tags useCases createdAt')
    .lean()

  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm trong hệ thống.')
    error.statusCode = 404
    throw error
  }

  return product
}

function sanitizeAlternativeItems(items = [], validIdSet = new Set()) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      productId: normalizeId(item?.productId),
      reason: normalizeText(item?.reason),
    }))
    .filter((item) => item.productId && validIdSet.has(item.productId))
    .slice(0, 3)
}

function buildProductExplainPrompt({ product, question, alternatives }) {
  const briefProduct = toGeminiProductBrief(product)
  const briefAlternatives = Array.isArray(alternatives) ? alternatives.slice(0, 5).map(toGeminiProductBrief) : []

  return `
Bạn là AI Product Explainer cho ecommerce Nexora.
Chỉ được dùng dữ liệu sản phẩm được cung cấp. Không bịa thêm sản phẩm ngoài danh sách.

Yêu cầu:
- Trả lời tiếng Việt tự nhiên, ngắn gọn, dễ hiểu.
- Đánh giá: phù hợp với ai, điểm mạnh, điểm yếu, có đáng mua không.
- Đánh giá riêng cho 3 nhu cầu: học tập, gaming, văn phòng.
- Nếu có phương án tốt hơn thì chỉ chọn từ "Danh sách lựa chọn thay thế hợp lệ".

Trả về JSON đúng schema:
{
  "summary": "string",
  "suitableFor": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "isWorthBuying": "string",
  "fitForStudy": "string",
  "fitForGaming": "string",
  "fitForOffice": "string",
  "betterAlternatives": [
    { "productId": "string", "reason": "string" }
  ],
  "finalRecommendation": "string"
}

Sản phẩm người dùng đang hỏi:
${JSON.stringify(briefProduct, null, 2)}

Câu hỏi người dùng:
${normalizeText(question || 'Sản phẩm này có đáng mua không?')}

Danh sách lựa chọn thay thế hợp lệ:
${JSON.stringify(briefAlternatives, null, 2)}
  `.trim()
}

function fallbackProductExplain({ product, alternatives }) {
  const alternativeItems = alternatives.slice(0, 2)

  return {
    summary: `${product.name} thuộc nhóm ${product.category} với mức giá ${product.price.toLocaleString('vi-VN')} VND.`,
    suitableFor: `Phù hợp người dùng cần ${product.category.toLowerCase()} trong tầm giá hiện tại.`,
    strengths: [
      'Mức giá và thông tin cấu hình khá rõ để so sánh.',
      product.stock > 0 ? 'Sản phẩm đang còn hàng.' : 'Thông tin vẫn hữu ích để tham chiếu.',
    ],
    weaknesses: [
      product.stock > 0 ? 'Cần đối chiếu thêm theo nhu cầu cụ thể của bạn.' : 'Hiện đang tạm hết hàng.',
    ],
    isWorthBuying: product.stock > 0 ? 'Đáng cân nhắc nếu đúng nhu cầu chính.' : 'Nên cân nhắc mẫu khác do đang hết hàng.',
    fitForStudy: 'Phù hợp cho học tập cơ bản nếu bạn ưu tiên cân bằng giá/nhu cầu.',
    fitForGaming: 'Nên kiểm tra kỹ CPU/GPU/RAM trước khi chốt cho gaming.',
    fitForOffice: 'Phù hợp cho văn phòng nếu ưu tiên ổn định và chi phí hợp lý.',
    betterAlternatives: alternativeItems.map((item) => ({
      productId: item.id,
      reason: `Bạn có thể so sánh thêm ${item.name} để đối chiếu giá trị sử dụng.`,
    })),
    finalRecommendation: 'Nên so sánh thêm 1-2 mẫu cùng tầm giá trước khi chốt đơn.',
  }
}

export async function explainProductWithAi({ productId, question }) {
  const productDoc = await getProductByIdOrThrow(productId)
  const product = toCompactProduct(productDoc)

  const alternativeDocs = await Product.find({
    _id: { $ne: productDoc._id },
    category: productDoc.category,
  })
    .select('name category brand description price stock image specs tags useCases createdAt')
    .sort({ stock: -1, createdAt: -1 })
    .limit(8)
    .lean()

  const alternatives = alternativeDocs.map(toCompactProduct)
  const validAlternativeIdSet = new Set(alternatives.map((item) => item.id))
  const fallback = fallbackProductExplain({ product, alternatives })

  try {
    const prompt = buildProductExplainPrompt({ product, question, alternatives })
    const aiJson = await generateGeminiJson(prompt, { temperature: 0.1, route: 'product.explain' })
    const betterAlternatives = sanitizeAlternativeItems(aiJson?.betterAlternatives, validAlternativeIdSet)

    return {
      product,
      answer: {
        summary: normalizeText(aiJson?.summary || fallback.summary),
        suitableFor: normalizeText(aiJson?.suitableFor || fallback.suitableFor),
        strengths: Array.isArray(aiJson?.strengths)
          ? aiJson.strengths.map((item) => normalizeText(item)).filter(Boolean).slice(0, 6)
          : fallback.strengths,
        weaknesses: Array.isArray(aiJson?.weaknesses)
          ? aiJson.weaknesses.map((item) => normalizeText(item)).filter(Boolean).slice(0, 6)
          : fallback.weaknesses,
        isWorthBuying: normalizeText(aiJson?.isWorthBuying || fallback.isWorthBuying),
        fitForStudy: normalizeText(aiJson?.fitForStudy || fallback.fitForStudy),
        fitForGaming: normalizeText(aiJson?.fitForGaming || fallback.fitForGaming),
        fitForOffice: normalizeText(aiJson?.fitForOffice || fallback.fitForOffice),
        betterAlternatives,
        finalRecommendation: normalizeText(aiJson?.finalRecommendation || fallback.finalRecommendation),
      },
      alternativeProducts: alternatives,
    }
  } catch {
    return {
      product,
      answer: fallback,
      alternativeProducts: alternatives,
    }
  }
}

function normalizeCartItem(rawItem = {}) {
  return {
    productId: normalizeId(rawItem?.productId || rawItem?.id || rawItem?._id),
    quantity: Math.max(1, Number(rawItem?.quantity || 1)),
  }
}

function sanitizeCartItems(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  const dedupMap = new Map()
  for (const rawItem of items) {
    const normalizedItem = normalizeCartItem(rawItem)
    if (!normalizedItem.productId) {
      continue
    }

    if (!dedupMap.has(normalizedItem.productId)) {
      dedupMap.set(normalizedItem.productId, normalizedItem)
    } else {
      const current = dedupMap.get(normalizedItem.productId)
      dedupMap.set(normalizedItem.productId, {
        ...current,
        quantity: Math.max(1, Number(current.quantity || 1) + Number(normalizedItem.quantity || 1)),
      })
    }
  }

  return [...dedupMap.values()]
}

function buildCartAnalyzePrompt({ userNeed, cartProducts, suggestionProducts, totalAmount }) {
  const briefCartProducts = Array.isArray(cartProducts) ? cartProducts.slice(0, 8).map(toGeminiProductBrief) : []
  const briefSuggestionProducts = Array.isArray(suggestionProducts)
    ? suggestionProducts.slice(0, 8).map(toGeminiProductBrief)
    : []

  return `
Bạn là AI Cart Analyzer cho ecommerce Nexora.
Chỉ dùng dữ liệu sản phẩm được cung cấp bên dưới, không bịa sản phẩm ngoài danh sách.

Mục tiêu:
- Đánh giá giỏ hàng có hợp nhu cầu user không.
- Chỉ ra sản phẩm dư/thừa (nếu có).
- Chỉ ra phụ kiện thiếu (nếu có).
- Gợi ý thay thế (nếu có) và chỉ chọn từ danh sách sản phẩm gợi ý hợp lệ.
- Đánh giá tổng tiền có hợp lý không.

Trả về JSON theo schema:
{
  "summary": "string",
  "fitAssessment": "string",
  "redundantItems": [{ "productId": "string", "reason": "string" }],
  "missingAccessories": [{ "productId": "string", "reason": "string" }],
  "swapSuggestions": [{ "fromProductId": "string", "toProductId": "string", "reason": "string" }],
  "budgetAssessment": "string",
  "finalRecommendation": "string"
}

Nhu cầu user:
${normalizeText(userNeed || 'Chưa cung cấp rõ nhu cầu')}

Tổng tiền giỏ hàng hiện tại (VND):
${Number(totalAmount || 0)}

Sản phẩm trong giỏ hàng:
${JSON.stringify(briefCartProducts, null, 2)}

Danh sách sản phẩm gợi ý hợp lệ (chỉ được dùng danh sách này nếu đề xuất thêm/thay thế):
${JSON.stringify(briefSuggestionProducts, null, 2)}
  `.trim()
}

function sanitizeIdReasonItems(items = [], validIdSet = new Set()) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      productId: normalizeId(item?.productId),
      reason: normalizeText(item?.reason),
    }))
    .filter((item) => item.productId && validIdSet.has(item.productId))
    .slice(0, 6)
}

function sanitizeSwapItems(items = [], cartIdSet = new Set(), suggestionIdSet = new Set()) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      fromProductId: normalizeId(item?.fromProductId),
      toProductId: normalizeId(item?.toProductId),
      reason: normalizeText(item?.reason),
    }))
    .filter((item) => cartIdSet.has(item.fromProductId) && suggestionIdSet.has(item.toProductId))
    .slice(0, 6)
}

function pickSuggestionByKeyword(suggestionProducts = [], keywords = []) {
  const keywordSet = keywords.map((item) => normalizeTextFold(item)).filter(Boolean)

  return suggestionProducts.find((product) => {
    const searchable = normalizeTextFold(
      [product.name, product.category, product.description, product.tags?.join(' '), product.specs?.map((spec) => `${spec.label} ${spec.value}`).join(' ')]
        .filter(Boolean)
        .join(' '),
    )

    return keywordSet.some((keyword) => searchable.includes(keyword))
  })
}

function buildFallbackCartHints({ cartProducts, suggestionProducts, userNeed }) {
  const needs = normalizeText(userNeed)
  const categoryText = normalizeTextFold(cartProducts.map((item) => item.category).join(' '))

  const missingAccessories = []

  const hasLaptop = categoryText.includes('laptop')
  const hasPhone = categoryText.includes('dien thoai')
  const hasMouseOrKeyboard = cartProducts.some((item) => {
    const text = normalizeTextFold([item.name, item.category].join(' '))
    return text.includes('chuot') || text.includes('ban phim')
  })

  if (hasLaptop && !hasMouseOrKeyboard) {
    const accessory = pickSuggestionByKeyword(suggestionProducts, ['chuot', 'mouse', 'ban phim'])
    if (accessory) {
      missingAccessories.push({
        productId: accessory.id,
        reason: 'Bạn đang mua laptop, nên bổ sung chuột/bàn phím để học tập và làm việc thoải mái hơn.',
      })
    }
  }

  if (hasPhone) {
    const accessory = pickSuggestionByKeyword(suggestionProducts, ['tai nghe', 'sac', 'cap sac', 'adapter'])
    if (accessory) {
      missingAccessories.push({
        productId: accessory.id,
        reason: 'Nếu dùng điện thoại thường xuyên, bạn có thể cân nhắc thêm phụ kiện phù hợp để tối ưu trải nghiệm.',
      })
    }
  }

  const summary = `Giỏ hàng hiện có ${cartProducts.length} sản phẩm, tổng khoảng ${cartProducts
    .reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
    .toLocaleString('vi-VN')} VND.`

  return {
    summary,
    fitAssessment: needs
      ? 'Giỏ hàng đang khá sát với nhu cầu bạn mô tả, nhưng vẫn có thể tối ưu thêm theo tiêu chí sử dụng thực tế.'
      : 'Giỏ hàng có thể đáp ứng nhu cầu cơ bản, nên kiểm tra lại mục tiêu sử dụng chính.',
    redundantItems: [],
    missingAccessories: missingAccessories.slice(0, 3),
    swapSuggestions: [],
    budgetAssessment: 'Tổng tiền hiện tại ở mức hợp lý nếu các sản phẩm đều phục vụ nhu cầu chính của bạn.',
    finalRecommendation: 'Bạn có thể giữ sản phẩm trọng tâm và bổ sung phụ kiện cần thiết để tối ưu trải nghiệm.',
  }
}

export async function analyzeCartWithAi({ cartItems, userNeed }) {
  const normalizedCartItems = sanitizeCartItems(cartItems)
  if (normalizedCartItems.length === 0) {
    const error = new Error('Giỏ hàng trống hoặc dữ liệu cartItems không hợp lệ.')
    error.statusCode = 400
    throw error
  }

  const validIds = normalizedCartItems
    .filter((item) => mongoose.Types.ObjectId.isValid(item.productId))
    .map((item) => item.productId)

  if (validIds.length === 0) {
    const error = new Error('Không có productId hợp lệ trong giỏ hàng.')
    error.statusCode = 400
    throw error
  }

  const dbProducts = await Product.find({ _id: { $in: validIds } })
    .select('name category brand description price stock image specs tags useCases createdAt')
    .lean()

  if (dbProducts.length === 0) {
    const error = new Error('Không tìm thấy sản phẩm hợp lệ trong giỏ hàng từ database.')
    error.statusCode = 404
    throw error
  }

  const productMap = new Map(dbProducts.map((product) => [String(product._id), product]))
  const cartProducts = normalizedCartItems
    .map((item) => {
      const dbProduct = productMap.get(item.productId)
      if (!dbProduct) {
        return null
      }

      const compact = toCompactProduct(dbProduct)
      return {
        ...compact,
        quantity: item.quantity,
        lineTotal: Number(compact.price || 0) * Number(item.quantity || 1),
      }
    })
    .filter(Boolean)

  if (cartProducts.length === 0) {
    const error = new Error('Không thể đồng bộ giỏ hàng với dữ liệu sản phẩm mới nhất.')
    error.statusCode = 400
    throw error
  }

  const cartCategorySet = new Set(cartProducts.map((item) => item.category).filter(Boolean))
  const suggestionDocs = await Product.find({
    _id: { $nin: cartProducts.map((item) => item.id).filter((id) => mongoose.Types.ObjectId.isValid(id)) },
    category: { $in: [...cartCategorySet, 'Phu kien', 'Am thanh'] },
  })
    .select('name category brand description price stock image specs tags useCases createdAt')
    .sort({ stock: -1, createdAt: -1 })
    .limit(18)
    .lean()

  const suggestionProducts = suggestionDocs.map(toCompactProduct)
  const totalAmount = cartProducts.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
  const cartIdSet = new Set(cartProducts.map((item) => item.id))
  const suggestionIdSet = new Set(suggestionProducts.map((item) => item.id))

  const fallback = buildFallbackCartHints({
    cartProducts,
    suggestionProducts,
    userNeed,
  })

  try {
    const prompt = buildCartAnalyzePrompt({
      userNeed,
      cartProducts,
      suggestionProducts,
      totalAmount,
    })

    const aiJson = await generateGeminiJson(prompt, { temperature: 0.1, route: 'cart.analyze' })
    const redundantItems = sanitizeIdReasonItems(aiJson?.redundantItems, cartIdSet)
    const missingAccessories = sanitizeIdReasonItems(aiJson?.missingAccessories, suggestionIdSet)
    const swapSuggestions = sanitizeSwapItems(aiJson?.swapSuggestions, cartIdSet, suggestionIdSet)

    const referencedSuggestionIds = new Set([
      ...missingAccessories.map((item) => item.productId),
      ...swapSuggestions.map((item) => item.toProductId),
    ])
    const referencedSuggestions = suggestionProducts.filter((item) => referencedSuggestionIds.has(item.id))

    const normalizedFitAssessment = normalizeText(aiJson?.fitAssessment || '')
    const normalizedNeedFold = normalizeTextFold(userNeed || '')
    const shouldUseFallbackFitAssessment =
      !normalizedFitAssessment ||
      (normalizedNeedFold && normalizeTextFold(normalizedFitAssessment).includes(normalizedNeedFold))

    return {
      cartProducts,
      suggestionProducts,
      referencedSuggestions,
      analysis: {
        summary: normalizeText(aiJson?.summary || fallback.summary),
        fitAssessment: shouldUseFallbackFitAssessment
          ? fallback.fitAssessment
          : normalizedFitAssessment,
        redundantItems,
        missingAccessories,
        swapSuggestions,
        budgetAssessment: normalizeText(aiJson?.budgetAssessment || fallback.budgetAssessment),
        finalRecommendation: normalizeText(aiJson?.finalRecommendation || fallback.finalRecommendation),
      },
      totalAmount,
    }
  } catch {
    const referencedSuggestions = suggestionProducts.filter((item) =>
      fallback.missingAccessories.some((missingItem) => missingItem.productId === item.id),
    )

    return {
      cartProducts,
      suggestionProducts,
      referencedSuggestions,
      analysis: fallback,
      totalAmount,
    }
  }
}
