import { generateGeminiJson } from './geminiService.js'
import { getInventoryHealthSnapshot, getInventoryDashboard } from './inventoryDashboardService.js'

function normalizeText(value = '') {
  return String(value || '').trim()
}

function buildFallbackRecommendations(snapshot = {}) {
  const recommendations = []

  for (const product of snapshot.lowStockProducts || []) {
    recommendations.push({
      type: 'LOW_STOCK',
      message: `${product.name} đang sắp hết hàng. Nên nhập thêm khoảng ${Math.max(10, product.minStockLevel * 2)} đơn vị.`,
      productId: product.id,
    })
  }

  for (const product of snapshot.outOfStockProducts || []) {
    recommendations.push({
      type: 'OUT_OF_STOCK',
      message: `${product.name} hiện đã hết hàng. Nên ưu tiên nhập bổ sung sớm.`,
      productId: product.id,
    })
  }

  for (const product of snapshot.overstockProducts || []) {
    recommendations.push({
      type: 'OVERSTOCK',
      message: `${product.name} đang tồn kho cao. Nên kiểm tra kế hoạch bán hàng hoặc điều chỉnh số lượng nhập.`,
      productId: product.id,
    })
  }

  return {
    summary:
      recommendations.length > 0
        ? 'Hệ thống ghi nhận một số sản phẩm cần xử lý tồn kho.'
        : 'Tồn kho đang ổn định.',
    recommendations: recommendations.slice(0, 8),
  }
}

function buildInventoryInsightPrompt({ context, snapshot }) {
  return `
Bạn là AI Inventory Assistant của Nexora.
Chỉ được đưa ra khuyến nghị dựa trên snapshot dữ liệu kho bên dưới.

Trả về JSON hợp lệ theo mẫu:
{
  "summary": "string",
  "recommendations": [
    {
      "type": "LOW_STOCK|OUT_OF_STOCK|OVERSTOCK",
      "productId": "string",
      "message": "string"
    }
  ]
}

Quy tắc:
- Mỗi khuyến nghị phải cụ thể, ngắn gọn, có thể hành động.
- Tập trung vào hàng sắp hết, hết hàng và tồn kho quá cao.
- Không được đề xuất sản phẩm ngoài snapshot.
- Nếu không có vấn đề rõ ràng, trả về summary ổn định.

Context:
${JSON.stringify(context || {}, null, 2)}

Snapshot tồn kho:
${JSON.stringify(snapshot, null, 2)}
  `.trim()
}

export async function buildInventoryInsights(context = {}) {
  const snapshot = await getInventoryHealthSnapshot()
  const fallback = buildFallbackRecommendations(snapshot)

  try {
    const prompt = buildInventoryInsightPrompt({
      context,
      snapshot,
    })

    const aiJson = await generateGeminiJson(prompt, { temperature: 0.15, route: 'inventory.insights' })

    return {
      summary: normalizeText(aiJson?.summary || fallback.summary) || fallback.summary,
      recommendations: Array.isArray(aiJson?.recommendations)
        ? aiJson.recommendations
            .map((item) => ({
              type: normalizeText(item?.type || 'LOW_STOCK').toUpperCase(),
              productId: normalizeText(item?.productId || ''),
              message: normalizeText(item?.message || ''),
            }))
            .filter((item) => item.message)
            .slice(0, 8)
        : fallback.recommendations,
    }
  } catch {
    return fallback
  }
}
