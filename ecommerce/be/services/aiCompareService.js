import mongoose from 'mongoose'
import Product from '../models/Product.js'
import { generateGeminiJson } from './geminiService.js'
import { mapProductForResponse } from './productMatchingService.js'

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeId(value) {
  return String(value || '').trim()
}

function resolveProductIds({ productIds, products }) {
  const idsFromBody = Array.isArray(productIds) ? productIds : []
  const idsFromProducts = Array.isArray(products) ? products.map((item) => item?._id || item?.id).filter(Boolean) : []

  return [...new Set([...idsFromBody, ...idsFromProducts].map((value) => normalizeId(value)).filter(Boolean))]
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

function buildComparePrompt({ products, focus, useCase }) {
  const geminiProducts = Array.isArray(products) ? products.slice(0, 5).map(toGeminiProductBrief) : []

  return `
Bạn là AI Smart Compare của Nexora.
Chỉ được so sánh đúng danh sách sản phẩm đã cung cấp.

Phong cách trả lời:
- Giống tech reviewer assistant.
- Tập trung theo nhu cầu thực tế: học tập, gaming, pin, cơ động, value for money.
- Ưu tiên ngắn gọn, lý do rõ ràng.

Trả về JSON theo schema:
{
  "summary": "string",
  "bestForStudy": { "productId": "string", "reason": "string" },
  "bestForGaming": { "productId": "string", "reason": "string" },
  "bestValue": { "productId": "string", "reason": "string" },
  "recommendation": "string"
}

Nếu thiếu dữ liệu, reason cần nói rõ "chưa đủ dữ liệu".

Ngữ cảnh:
${JSON.stringify(focus || {}, null, 2)}

Use case ưu tiên:
${normalizeText(useCase || '') || 'Chưa rõ'}

Danh sách sản phẩm:
${JSON.stringify(geminiProducts, null, 2)}
  `.trim()
}

function fallbackPick(products = [], strategy = 'value') {
  if (!Array.isArray(products) || products.length === 0) {
    return null
  }

  const inStock = products.filter((product) => Number(product.stock || 0) > 0)
  const source = inStock.length > 0 ? inStock : products

  if (strategy === 'study') {
    return [...source].sort((a, b) => Number(a.price || 0) - Number(b.price || 0))[0]
  }

  if (strategy === 'gaming') {
    return [...source].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))[0]
  }

  return [...source].sort((a, b) => Number(a.price || 0) - Number(b.price || 0))[0]
}

function fallbackCompare(products = [], useCase = '') {
  const bestForStudy = fallbackPick(products, 'study')
  const bestForGaming = fallbackPick(products, 'gaming')
  const bestValue = fallbackPick(products, 'value')

  return {
    summary: `Mình đã so sánh nhanh theo giá, tồn kho và mô tả hiện có trong dữ liệu Nexora${useCase ? ` cho nhu cầu ${useCase}` : ''}.`,
    bestForStudy: {
      productId: normalizeId(bestForStudy?.id),
      reason: bestForStudy ? `${bestForStudy.name} có mức giá dễ tiếp cận cho học tập.` : 'Chưa đủ dữ liệu.',
    },
    bestForGaming: {
      productId: normalizeId(bestForGaming?.id),
      reason: bestForGaming ? `${bestForGaming.name} thiên hiệu năng hơn trong nhóm hiện tại.` : 'Chưa đủ dữ liệu.',
    },
    bestValue: {
      productId: normalizeId(bestValue?.id),
      reason: bestValue ? `${bestValue.name} cân bằng nhất giữa giá và nhu cầu phổ thông.` : 'Chưa đủ dữ liệu.',
    },
    recommendation: 'Nếu ưu tiên ổn định dài hạn, hãy chốt mẫu còn hàng tốt và phù hợp nhu cầu chính.',
  }
}

function sanitizePick(item, fallbackItem) {
  return {
    productId: normalizeId(item?.productId || fallbackItem?.productId || ''),
    reason: normalizeText(item?.reason || fallbackItem?.reason || 'Chưa có nhận xét.'),
  }
}

export async function compareProductsWithAi({ productIds, products, focus = {} }) {
  const ids = resolveProductIds({ productIds, products })
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .slice(0, 5)

  if (ids.length < 2) {
    const error = new Error('Cần ít nhất 2 sản phẩm để so sánh.')
    error.statusCode = 400
    throw error
  }

  const dbProducts = await Product.find({ _id: { $in: ids } })
    .select('name category brand description price stock image specs tags useCases averageRating totalReviews ratingBreakdown reviewSummary')
    .lean()

  if (dbProducts.length < 2) {
    const error = new Error('Không tìm thấy đủ sản phẩm hợp lệ trong database để so sánh.')
    error.statusCode = 404
    throw error
  }

  const mappedProducts = dbProducts.map(mapProductForResponse)
  const useCase = normalizeText(focus?.useCase || focus?.question || '')
  const fallback = fallbackCompare(mappedProducts, useCase)

  function toPickSummary(pick) {
    if (!pick?.productId) {
      return normalizeText(pick?.reason || 'Chưa đủ dữ liệu.')
    }

    const matched = mappedProducts.find((item) => item.id === pick.productId)
    const productName = matched?.name || 'Sản phẩm'
    const reason = normalizeText(pick?.reason || '')
    return reason ? `${productName}: ${reason}` : productName
  }

  try {
    const prompt = buildComparePrompt({ products: mappedProducts, focus, useCase })
    const aiJson = await generateGeminiJson(prompt, { temperature: 0.1, route: 'compare.main' })
    const bestForStudyPick = sanitizePick(aiJson?.bestForStudy, fallback.bestForStudy)
    const bestForGamingPick = sanitizePick(aiJson?.bestForGaming, fallback.bestForGaming)
    const bestValuePick = sanitizePick(aiJson?.bestValue, fallback.bestValue)

    return {
      comparedProducts: mappedProducts,
      summary: normalizeText(aiJson?.summary || fallback.summary),
      bestForStudy: bestForStudyPick,
      bestForGaming: bestForGamingPick,
      bestValue: bestValuePick,
      bestForStudyText: toPickSummary(bestForStudyPick),
      bestForGamingText: toPickSummary(bestForGamingPick),
      bestValueText: toPickSummary(bestValuePick),
      bestForStudyPick,
      bestForGamingPick,
      bestValuePick,
      recommendation: normalizeText(aiJson?.recommendation || fallback.recommendation),
    }
  } catch {
    const bestForStudyPick = fallback.bestForStudy
    const bestForGamingPick = fallback.bestForGaming
    const bestValuePick = fallback.bestValue

    return {
      comparedProducts: mappedProducts,
      summary: fallback.summary,
      bestForStudy: bestForStudyPick,
      bestForGaming: bestForGamingPick,
      bestValue: bestValuePick,
      bestForStudyText: toPickSummary(bestForStudyPick),
      bestForGamingText: toPickSummary(bestForGamingPick),
      bestValueText: toPickSummary(bestValuePick),
      bestForStudyPick,
      bestForGamingPick,
      bestValuePick,
      recommendation: fallback.recommendation,
    }
  }
}
