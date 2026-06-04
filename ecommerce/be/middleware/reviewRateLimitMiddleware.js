const REVIEW_WRITE_WINDOW_MS = 60_000
const REVIEW_WRITE_MAX_ACTIONS = 12
const REVIEW_REPEAT_COOLDOWN_MS = 2_500

const reviewWriteWindowMap = new Map()
const recentReviewActionMap = new Map()

function nowMs() {
  return Date.now()
}

function buildActorKey(req) {
  const userId = String(req.user?.id || '').trim()
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').trim()
  return userId || ip || 'anonymous'
}

function buildRequestSignature(req) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  return JSON.stringify({
    method: req.method,
    path: req.path,
    params: req.params,
    rating: Number(body?.rating || 0),
    title: String(body?.title || '').trim().slice(0, 80),
    comment: String(body?.comment || '').trim().slice(0, 180),
  })
}

export function reviewWriteRateLimit(req, res, next) {
  const actorKey = buildActorKey(req)
  const windowKey = `${actorKey}::${req.method}`
  const signatureKey = `${actorKey}::${buildRequestSignature(req)}`
  const now = nowMs()

  const timestamps = (reviewWriteWindowMap.get(windowKey) || []).filter(
    (timestamp) => now - timestamp <= REVIEW_WRITE_WINDOW_MS,
  )
  timestamps.push(now)
  reviewWriteWindowMap.set(windowKey, timestamps)

  if (timestamps.length > REVIEW_WRITE_MAX_ACTIONS) {
    return res.status(429).json({
      message: 'Bạn đang thao tác review quá nhanh. Vui lòng chờ một chút rồi thử lại.',
    })
  }

  const lastActionAt = Number(recentReviewActionMap.get(signatureKey) || 0)
  recentReviewActionMap.set(signatureKey, now)

  if (lastActionAt > 0 && now - lastActionAt <= REVIEW_REPEAT_COOLDOWN_MS) {
    return res.status(429).json({
      message: 'Yêu cầu review vừa được gửi. Vui lòng đợi trong giây lát.',
    })
  }

  return next()
}
