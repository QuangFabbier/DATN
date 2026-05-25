import { GoogleGenerativeAI } from '@google/generative-ai'
import { safeJsonParseFromText } from './aiJsonUtils.js'

function buildError(message, statusCode = 500) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getGeminiConfig() {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim()
  const model = String(process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim()

  if (!apiKey) {
    throw buildError('GEMINI_API_KEY chua duoc cau hinh', 500)
  }

  return { apiKey, model }
}

function getGenerativeModel() {
  const { apiKey, model } = getGeminiConfig()
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model })
}

function getTemperature(explicitTemperature) {
  const fromEnv = Number(process.env.GEMINI_TEMPERATURE)

  if (Number.isFinite(explicitTemperature)) {
    return explicitTemperature
  }

  if (Number.isFinite(fromEnv)) {
    return Math.min(1, Math.max(0, fromEnv))
  }

  return 0.2
}

async function generateGeminiText(prompt, { temperature } = {}) {
  const model = getGenerativeModel()
  const nextTemperature = getTemperature(temperature)

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: String(prompt || '').trim() }] }],
      generationConfig: {
        temperature: nextTemperature,
        responseMimeType: 'application/json',
      },
    })

    return result?.response?.text?.() || ''
  } catch {
    const fallbackResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: String(prompt || '').trim() }] }],
      generationConfig: {
        temperature: nextTemperature,
      },
    })

    return fallbackResult?.response?.text?.() || ''
  }
}

export async function generateGeminiJson(prompt, options = {}) {
  const text = await generateGeminiText(prompt, options)
  const parsed = safeJsonParseFromText(text)

  if (!parsed || typeof parsed !== 'object') {
    throw buildError('AI tra ve JSON khong hop le', 502)
  }

  return parsed
}