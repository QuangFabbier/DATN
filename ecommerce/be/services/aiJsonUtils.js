function normalizeText(value = '') {
  return String(value || '').trim()
}

function extractBalancedJsonBlock(text = '') {
  const source = String(text || '')
  let depth = 0
  let startIndex = -1
  let isInString = false
  let isEscaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (isEscaped) {
      isEscaped = false
      continue
    }

    if (character === '\\') {
      isEscaped = true
      continue
    }

    if (character === '"') {
      isInString = !isInString
      continue
    }

    if (isInString) {
      continue
    }

    if (character === '{') {
      if (depth === 0) {
        startIndex = index
      }
      depth += 1
      continue
    }

    if (character === '}') {
      depth -= 1

      if (depth === 0 && startIndex >= 0) {
        return source.slice(startIndex, index + 1)
      }

      if (depth < 0) {
        depth = 0
        startIndex = -1
      }
    }
  }

  return ''
}

function parseJsonCandidate(candidate = '') {
  const trimmed = normalizeText(candidate)

  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

export function safeJsonParseFromText(rawText = '') {
  const text = normalizeText(rawText)

  if (!text) {
    return null
  }

  const directParsed = parseJsonCandidate(text)
  if (directParsed !== null) {
    return directParsed
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const fencedParsed = parseJsonCandidate(fencedMatch?.[1] || '')
  if (fencedParsed !== null) {
    return fencedParsed
  }

  const blockCandidate = extractBalancedJsonBlock(text)
  const blockParsed = parseJsonCandidate(blockCandidate)
  if (blockParsed !== null) {
    return blockParsed
  }

  return null
}

export function sanitizeStringArray(values, limit = 8) {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))].slice(0, limit)
}

export function normalizeTextFold(value = '') {
  return String(value || '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function coerceBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = normalizeTextFold(value)

    if (['true', 'yes', 'co', 'can', '1'].includes(normalized)) {
      return true
    }

    if (['false', 'no', 'khong', '0'].includes(normalized)) {
      return false
    }
  }

  return fallback
}
