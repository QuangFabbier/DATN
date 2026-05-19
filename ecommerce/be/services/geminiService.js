import { GoogleGenerativeAI } from "@google/generative-ai";

function normalizeJsonResponse(rawText = "") {
  const responseText = String(rawText || "").trim();

  if (!responseText) {
    return null;
  }

  const fencedMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonCandidate = fencedMatch?.[1] || responseText;

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    return null;
  }
}

function buildPrompt({ message, context, candidateProducts }) {
  return `
Bạn là AI tư vấn mua sắm cho Nexora.

NHIỆM VỤ:
- Tư vấn bằng tiếng Việt, ngắn gọn, dễ hiểu.
- Nếu user hỏi xem sản phẩm và không có như cầu khác thì cho user xem
- CHỈ được dùng sản phẩm trong danh sách bên dưới.
- Không được bịa sản phẩm ngoài danh sách.
- Nếu không có sản phẩm phù hợp, nói rõ lý do và trả recommendedProductIds là mảng rỗng.
- Ưu tiên tối đa 5 sản phẩm trong recommendedProductIds.

RÀNG BUỘC TRẢ VỀ:
- Chỉ trả về JSON hợp lệ, không thêm markdown/code fence.
- JSON schema:
{
  "reply": "string",
  "recommendedProductIds": ["string"]
}

NGỮ CẢNH NGƯỜI DÙNG:
${JSON.stringify(context || {}, null, 2)}

YÊU CẦU NGƯỜI DÙNG:
${String(message || "").trim()}

DANH SÁCH SẢN PHẨM CHO PHÉP:
${JSON.stringify(candidateProducts, null, 2)}
  `.trim();
}

function getGeminiModel() {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const modelName = String(
    process.env.GEMINI_MODEL || "gemini-1.5-flash",
  ).trim();

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY chưa được cấu hình");
    error.statusCode = 500;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateAiConsultation({
  message,
  context = {},
  candidateProducts = [],
}) {
  const model = getGeminiModel();
  const prompt = buildPrompt({ message, context, candidateProducts });

  const result = await model.generateContent(prompt);
  const responseText = result?.response?.text?.() || "";
  const parsedResponse = normalizeJsonResponse(responseText);

  if (!parsedResponse || typeof parsedResponse !== "object") {
    const error = new Error("AI trả về dữ liệu không hợp lệ");
    error.statusCode = 502;
    throw error;
  }

  return {
    reply: String(parsedResponse.reply || "").trim(),
    recommendedProductIds: Array.isArray(parsedResponse.recommendedProductIds)
      ? parsedResponse.recommendedProductIds
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      : [],
  };
}
