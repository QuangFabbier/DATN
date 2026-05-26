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
  const idsFromProducts = Array.isArray(products)
    ? products.map((item) => item?._id || item?.id).filter(Boolean)
    : []

  return [...new Set([...idsFromBody, ...idsFromProducts].map((value) => normalizeId(value)).filter(Boolean))]
}

function buildComparePrompt({ products, focus }) {
  return `
Ban la AI Compare Explainer cho Nexora.
Chi duoc so sanh dung danh sach san pham da cung cap.

Tieu chi so sanh: gia, hieu nang, nhu cau hoc tap, gaming, pin, thiet ke, value for money.

Tra ve JSON hop le theo schema:
{
  "summary": "string",
  "bestForStudy": { "productId": "string", "reason": "string" },
  "bestForGaming": { "productId": "string", "reason": "string" },
  "bestValue": { "productId": "string", "reason": "string" },
  "recommendation": "string"
}

Neu khong du thong tin cho tieu chi nao, ghi reason ngan gon va co the de productId rong.

Ngu canh bo sung:
${JSON.stringify(focus || {}, null, 2)}

San pham:
${JSON.stringify(products, null, 2)}
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

function fallbackCompare(products = []) {
  const bestForStudy = fallbackPick(products, 'study')
  const bestForGaming = fallbackPick(products, 'gaming')
  const bestValue = fallbackPick(products, 'value')

  return {
    summary: 'Minh da so sanh theo gia, ton kho va mo ta hien co trong database Nexora.',
    bestForStudy: {
      productId: normalizeId(bestForStudy?.id),
      reason: bestForStudy ? `${bestForStudy.name} co muc gia de tiep can cho hoc tap.` : 'Chua du du lieu.',
    },
    bestForGaming: {
      productId: normalizeId(bestForGaming?.id),
      reason: bestForGaming ? `${bestForGaming.name} co dinh gia cao hon, thuong phu hop nhom uu tien hieu nang.` : 'Chua du du lieu.',
    },
    bestValue: {
      productId: normalizeId(bestValue?.id),
      reason: bestValue ? `${bestValue.name} la lua chon can bang nhat theo gia hien tai.` : 'Chua du du lieu.',
    },
    recommendation: 'Ban nen uu tien nhu cau su dung chinh, sau do chot mau co ton kho va gia hop ly nhat.',
  }
}

function sanitizePick(item, fallbackItem) {
  return {
    productId: normalizeId(item?.productId || fallbackItem?.productId || ''),
    reason: normalizeText(item?.reason || fallbackItem?.reason || 'Chua co nhan xet.'),
  }
}

export async function compareProductsWithAi({ productIds, products, focus = {} }) {
  const ids = resolveProductIds({ productIds, products })
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .slice(0, 5)

  if (ids.length < 2) {
    const error = new Error('Can it nhat 2 san pham de so sanh.')
    error.statusCode = 400
    throw error
  }

  const dbProducts = await Product.find({ _id: { $in: ids } })
    .select('name category description price stock image specs')
    .lean()

  if (dbProducts.length < 2) {
    const error = new Error('Khong tim thay du san pham hop le trong database de so sanh.')
    error.statusCode = 404
    throw error
  }

  const mappedProducts = dbProducts.map(mapProductForResponse)
  const fallback = fallbackCompare(mappedProducts)

  try {
    const prompt = buildComparePrompt({ products: mappedProducts, focus })
    const aiJson = await generateGeminiJson(prompt, { temperature: 0.15 })

    return {
      comparedProducts: mappedProducts,
      summary: normalizeText(aiJson?.summary || fallback.summary),
      bestForStudy: sanitizePick(aiJson?.bestForStudy, fallback.bestForStudy),
      bestForGaming: sanitizePick(aiJson?.bestForGaming, fallback.bestForGaming),
      bestValue: sanitizePick(aiJson?.bestValue, fallback.bestValue),
      recommendation: normalizeText(aiJson?.recommendation || fallback.recommendation),
    }
  } catch {
    return {
      comparedProducts: mappedProducts,
      ...fallback,
    }
  }
}
