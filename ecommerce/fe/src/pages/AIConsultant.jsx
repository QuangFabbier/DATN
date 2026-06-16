import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useCompare } from '../hooks/useCompare'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { getAIPreferences } from '../services/accountStorage'
import { chatWithAi, compareProductsWithAi } from '../services/aiService'
import { getProducts } from '../services/productService'
import {
  clearPersistedConsultantSession,
  readPersistedConsultantSession,
  writePersistedConsultantSession,
} from '../utils/aiConsultantSession'
import {
  buildConsultantSessionTitle,
  clearActiveConsultantSessionId,
  createConsultantSessionId,
  readActiveConsultantSessionId,
  readConsultantHistory,
  removeConsultantHistorySession,
  upsertConsultantHistorySession,
  writeActiveConsultantSessionId,
} from '../utils/aiConsultantHistory'
import { formatCurrency } from '../utils/formatCurrency'
import { formatCompareAssistantMessage, isCompareIntent, resolveCompareCandidates } from '../utils/aiConversation'
import { getProductCategoryLabel } from '../utils/product'
import StarRating from '../components/StarRating'

const PRODUCT_FALLBACK_IMAGE = 'https://placehold.co/120x120/e5e7eb/111827?text=Nexora'
const MAX_WIDGET_PRODUCTS = 5
const DEFAULT_ASSISTANT_MESSAGE = {
  id: 1,
  role: 'assistant',
  content: 'Xin chào, mình là Nexora. Bạn cứ mô tả nhu cầu, mình sẽ lọc sản phẩm từ kho Nexora và tư vấn chi tiết.',
  recommendedProducts: [],
}

function normalizeAssistantCopy(value = '') {
  return String(value || '')
    .replace(/\bAI Shopping Assistant\b/g, 'Nexora')
    .replace(/\bAI đang soạn tư vấn\.\.\./g, 'Nexora đang suy nghĩ...')
    .replace(/\bAI dang so?n tu v?n\.\.\./g, 'Nexora đang suy nghĩ...')
    .replace(/\bAI\b/g, 'Nexora')
}

const QUICK_SUGGESTION_CHIPS = [
  'Laptop học lập trình dưới 25 triệu',
  'Tai nghe chống ồn',
  'Điện thoại pin trâu',
  'So sánh sản phẩm trong giỏ',
]

const CATEGORY_KEYWORD_RULES = [
  { category: 'Phone', keywords: ['dien thoai', 'phone', 'smartphone', 'mobile'] },
  { category: 'Tablet', keywords: ['tablet', 'may tinh bang', 'ipad'] },
  { category: 'Laptop', keywords: ['laptop', 'notebook', 'may tinh xach tay', 'may tinh', 'pc', 'computer', 'macbook', 'gaming pc'] },
  { category: 'Headphones', keywords: ['tai nghe', 'headphone', 'earbud', 'audio', 'chong on'] },
  { category: 'Monitor', keywords: ['man hinh', 'monitor', 'display'] },
  { category: 'Mouse', keywords: ['chuot', 'mouse'] },
  { category: 'Keyboard', keywords: ['ban phim', 'keyboard'] },
  { category: 'SSD', keywords: ['ssd', 'ocung', 'o cung', 'storage'] },
  { category: 'RAM', keywords: ['ram', 'bo nho'] },
  { category: 'Power Bank', keywords: ['sac du phong', 'power bank'] },
  { category: 'Charging Cable', keywords: ['cap sac', 'charging cable', 'usb c', 'usb-c'] },
  { category: 'Charger', keywords: ['charger', 'sac', 'adapter', 'cu sac', 'bo sac'] },
  { category: 'Router', keywords: ['router', 'wifi', 'modem'] },
  { category: 'Smartwatch', keywords: ['smartwatch', 'dong ho thong minh'] },
]

function normalizeContextProducts(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.slice(0, 10).map((item) => ({
    id: String(item?.id || item?._id || ''),
    name: String(item?.name || ''),
    category: String(item?.category || ''),
    price: Number(item?.price || 0),
    quantity: Number(item?.quantity || 1),
  }))
}

function normalizeSearchText(value = '') {
  return String(value || '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function isViewProductsIntent(question = '') {
  const normalizedQuestion = normalizeSearchText(question)
  const intentKeywords = ['xem', 'danh sach', 'list', 'show', 'co gi', 'san pham', 'hang', 'shop co']

  return intentKeywords.some((keyword) => normalizedQuestion.includes(keyword))
}

function pickFallbackProducts(question = '', catalog = []) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    return []
  }

  const normalizedQuestion = normalizeSearchText(question)
  const matchedCategoryRules = CATEGORY_KEYWORD_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalizedQuestion.includes(normalizeSearchText(keyword))),
  )

  let filteredProducts = catalog

  if (matchedCategoryRules.length > 0) {
    filteredProducts = catalog.filter((product) => {
      const productCategory = normalizeSearchText(product?.category || '')
      return matchedCategoryRules.some((rule) => productCategory.includes(normalizeSearchText(rule.category)))
    })
  }

  if (filteredProducts.length === 0 && isViewProductsIntent(question)) {
    filteredProducts = [...catalog]
  }

  return filteredProducts
    .filter((product) => product?.id && product?.name)
    .sort((firstProduct, secondProduct) => Number(secondProduct?.stock || 0) - Number(firstProduct?.stock || 0))
    .slice(0, MAX_WIDGET_PRODUCTS)
    .map((product) => ({
      id: String(product.id),
      name: String(product.name || ''),
      category: String(product.category || ''),
      description: String(product.description || ''),
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      image: String(product.image || ''),
      averageRating: Number(product.averageRating || 0),
      totalReviews: Number(product.totalReviews || 0),
    }))
}

function normalizeConversationContextValue(context = null) {
  if (!context || typeof context !== 'object') {
    return null
  }

  return {
    category: String(context?.category || ''),
    budget:
      context?.budget && typeof context.budget === 'object'
        ? {
            min: Number.isFinite(Number(context.budget.min)) ? Number(context.budget.min) : null,
            max: Number.isFinite(Number(context.budget.max)) ? Number(context.budget.max) : null,
            currency: 'VND',
          }
        : { min: null, max: null, currency: 'VND' },
    useCase: String(context?.useCase || ''),
    priorities: Array.isArray(context?.priorities)
      ? context.priorities.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    preferredBrands: Array.isArray(context?.preferredBrands)
      ? context.preferredBrands.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    preferredProductFamilies: Array.isArray(context?.preferredProductFamilies)
      ? context.preferredProductFamilies.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    avoidBrands: Array.isArray(context?.avoidBrands)
      ? context.avoidBrands.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    lastRecommendedProductIds: Array.isArray(context?.lastRecommendedProductIds)
      ? context.lastRecommendedProductIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    conversationStage: String(context?.conversationStage || 'greeting'),
  }
}

function getConsultantTimestamp() {
  return Date.now()
}

function NexoraConsultant() {
  const { user } = useAuth()
  const { addToCart, cartItems } = useCart()
  const { compareItems, toggleCompare } = useCompare()
  const { favoriteItems } = useFavorites()
  const { showToast } = useToast()

  const persistedSession = useMemo(() => readPersistedConsultantSession(user), [user])
  const storedSessions = useMemo(() => readConsultantHistory(user), [user])
  const persistedActiveSessionId = useMemo(() => readActiveConsultantSessionId(user), [user])
  const initialPersistedSession = useMemo(() => {
    if (!persistedSession) {
      return null
    }

    const normalizedMessages = Array.isArray(persistedSession.messages) && persistedSession.messages.length > 0
      ? persistedSession.messages
      : [DEFAULT_ASSISTANT_MESSAGE]

    return {
      id: persistedActiveSessionId || createConsultantSessionId(),
      title: buildConsultantSessionTitle(normalizedMessages),
      question: persistedSession.question || '',
      messages: normalizedMessages,
      conversationContext: normalizeConversationContextValue(persistedSession.conversationContext),
      updatedAt: 0,
    }
  }, [persistedSession, persistedActiveSessionId])

  const [historySessions, setHistorySessions] = useState(() => {
    const mergedSessions = [...storedSessions]

    if (initialPersistedSession) {
      mergedSessions.unshift(initialPersistedSession)
    }

    return mergedSessions.filter(
      (session, index, allSessions) => index === allSessions.findIndex((candidate) => candidate.id === session.id),
    )
  })

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return persistedActiveSessionId || initialPersistedSession?.id || storedSessions[0]?.id || createConsultantSessionId()
  })
  const [question, setQuestion] = useState(() => persistedSession?.question || initialPersistedSession?.question || '')
  const [messages, setMessages] = useState(() =>
    persistedSession?.messages || initialPersistedSession?.messages || [DEFAULT_ASSISTANT_MESSAGE],
  )
  const [conversationContext, setConversationContext] = useState(() =>
    normalizeConversationContextValue(persistedSession?.conversationContext || initialPersistedSession?.conversationContext),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [productCatalog, setProductCatalog] = useState([])
  const messageIdRef = useRef(2)

  const hasMessages = useMemo(() => messages.length > 0, [messages.length])
  const sortedHistorySessions = useMemo(
    () => [...historySessions].sort((first, second) => Number(second.updatedAt) - Number(first.updatedAt)),
    [historySessions],
  )

  useEffect(() => {
    const nextIdFromMessages =
      messages.reduce(
        (maxId, message) => (Number.isFinite(Number(message?.id)) ? Math.max(maxId, Number(message.id)) : maxId),
        1,
      ) + 1

    messageIdRef.current = Math.max(2, nextIdFromMessages)
  }, [messages])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const sessionId = activeSessionId || createConsultantSessionId()
    const nextSession = {
      id: sessionId,
      title: buildConsultantSessionTitle(messages),
      question,
      messages,
      conversationContext,
      updatedAt: getConsultantTimestamp(),
    }

    queueMicrotask(() => {
      setHistorySessions((currentSessions) => upsertConsultantHistorySession(user, nextSession) || currentSessions)
    })
    writeActiveConsultantSessionId(user, sessionId)
    writePersistedConsultantSession(user, {
      question,
      messages,
      conversationContext,
    })
  }, [messages, question, conversationContext, user, activeSessionId])

  function nextMessageId() {
    const nextId = messageIdRef.current
    messageIdRef.current += 1
    return nextId
  }

  async function ensureProductCatalogLoaded() {
    if (productCatalog.length > 0) {
      return productCatalog
    }

    try {
      const products = await getProducts()
      const normalizedProducts = Array.isArray(products) ? products : []
      setProductCatalog(normalizedProducts)
      return normalizedProducts
    } catch {
      setProductCatalog([])
      return []
    }
  }

  function notifyCompareResult(result, productName) {
    showToast({
      type: result.status === 'limit' ? 'warning' : 'info',
      title:
        result.status === 'added'
          ? 'Đã thêm để so sánh'
          : result.status === 'removed'
            ? 'Đã bỏ khỏi so sánh'
            : 'Không thể thêm sản phẩm',
      message:
        result.status === 'limit'
          ? 'Bạn chỉ có thể so sánh tối đa 3 sản phẩm cùng lúc.'
          : `${productName} ${result.status === 'added' ? 'đã sẵn sàng để so sánh.' : 'không còn trong danh sách so sánh.'}`,
    })
  }

  function handleAddProductToCart(product) {
    const added = addToCart(product, 1)

    showToast({
      type: added ? 'success' : 'warning',
      title: added ? 'Đã thêm vào giỏ hàng' : 'Chưa thể thêm sản phẩm',
      message: added
        ? `${product.name} đã được thêm vào giỏ hàng.`
        : 'Sản phẩm đang hết hàng hoặc đã đạt số lượng tối đa.',
    })
  }

  function handleAddProductToCompare(product) {
    const result = toggleCompare(product)
    notifyCompareResult(result, product.name)
  }

  function applySession(session) {
    if (!session) {
      return
    }

    setActiveSessionId(session.id)
    setQuestion(session.question || '')
    setMessages(session.messages?.length > 0 ? session.messages : [DEFAULT_ASSISTANT_MESSAGE])
    setConversationContext(normalizeConversationContextValue(session.conversationContext))
    setIsLoading(false)
    setProductCatalog([])
    writeActiveConsultantSessionId(user, session.id)
    writePersistedConsultantSession(user, {
      question: session.question || '',
      messages: session.messages?.length > 0 ? session.messages : [DEFAULT_ASSISTANT_MESSAGE],
      conversationContext: normalizeConversationContextValue(session.conversationContext),
    })
  }

  function handleStartNewChat() {
    const newSessionId = createConsultantSessionId()
    const blankSession = {
      id: newSessionId,
      title: 'Cuộc trò chuyện mới',
      question: '',
      messages: [DEFAULT_ASSISTANT_MESSAGE],
      conversationContext: null,
      updatedAt: getConsultantTimestamp(),
    }

    setActiveSessionId(newSessionId)
    setQuestion('')
    setIsLoading(false)
    setProductCatalog([])
    setConversationContext(null)
    setMessages([DEFAULT_ASSISTANT_MESSAGE])
    setHistorySessions((currentSessions) => [blankSession, ...currentSessions.filter((item) => item.id !== newSessionId)])
    clearPersistedConsultantSession(user)
    clearActiveConsultantSessionId(user)
    writeActiveConsultantSessionId(user, newSessionId)
  }

  function handleSelectSession(sessionId) {
    const session = historySessions.find((item) => String(item.id) === String(sessionId))
    if (!session) {
      return
    }

    applySession(session)
  }

  function handleDeleteSession(sessionId) {
    const normalizedSessionId = String(sessionId || '').trim()
    if (!normalizedSessionId) {
      return
    }

    const nextSessions = removeConsultantHistorySession(user, normalizedSessionId)
    const isDeletingActiveSession = String(activeSessionId) === normalizedSessionId

    if (!isDeletingActiveSession) {
      setHistorySessions(nextSessions)
      return
    }

    const nextSession = nextSessions[0]

    if (nextSession) {
      setHistorySessions(nextSessions)
      applySession(nextSession)
      return
    }

    const newSessionId = createConsultantSessionId()
    const freshSession = {
      id: newSessionId,
      title: 'Cuộc trò chuyện mới',
      question: '',
      messages: [DEFAULT_ASSISTANT_MESSAGE],
      conversationContext: null,
      updatedAt: getConsultantTimestamp(),
    }

    setHistorySessions([])
    setActiveSessionId(newSessionId)
    setQuestion('')
    setIsLoading(false)
    setProductCatalog([])
    setConversationContext(null)
    setMessages([DEFAULT_ASSISTANT_MESSAGE])
    clearPersistedConsultantSession(user)
    clearActiveConsultantSessionId(user)
    writeActiveConsultantSessionId(user, newSessionId)
    setHistorySessions((currentSessions) => [freshSession, ...currentSessions.filter((item) => item.id !== newSessionId)])
  }

  async function submitQuestion(rawQuestion) {
    const trimmedQuestion = String(rawQuestion || '').trim()

    if (!trimmedQuestion || isLoading) {
      return
    }

    const userMessage = {
      id: nextMessageId(),
      role: 'user',
      content: trimmedQuestion,
      recommendedProducts: [],
    }

    const nextMessagesForAi = [...messages, userMessage]

    setMessages(nextMessagesForAi)
    setQuestion('')
    setIsLoading(true)

    try {
      if (isCompareIntent(trimmedQuestion)) {
        const compareCandidates = resolveCompareCandidates({
          question: trimmedQuestion,
          messages: nextMessagesForAi,
          compareItems,
          cartItems,
          max: 5,
        })

        if (compareCandidates.length >= 2) {
          const compareResult = await compareProductsWithAi({
            productIds: compareCandidates.map((item) => item.id).filter(Boolean).slice(0, 5),
            focus: { question: trimmedQuestion },
          })

          const compareMessage = {
            id: nextMessageId(),
            role: 'assistant',
            content: formatCompareAssistantMessage(compareResult),
            recommendedProducts: compareResult.comparedProducts.slice(0, MAX_WIDGET_PRODUCTS),
          }

          setMessages((currentMessages) => [...currentMessages, compareMessage])
          return
        }

        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: nextMessageId(),
            role: 'assistant',
            content: 'Mình cần ít nhất 2 sản phẩm hợp lệ trong giỏ hoặc danh sách so sánh để so sánh.',
            recommendedProducts: [],
          },
        ])
        return
      }

      const catalog = await ensureProductCatalogLoaded()
      const aiContext = {
        cartItems: normalizeContextProducts(cartItems),
        favoriteItems: normalizeContextProducts(favoriteItems),
        aiPreferences: getAIPreferences(user),
      }

      const aiResponse = await chatWithAi({
        message: trimmedQuestion,
        context: aiContext,
        conversationContext,
        allMessagesForSummary: nextMessagesForAi,
      })

      const fallbackProducts = pickFallbackProducts(trimmedQuestion, catalog)
      const nextRecommendedProducts =
        Array.isArray(aiResponse.recommendedProducts) && aiResponse.recommendedProducts.length > 0
          ? aiResponse.recommendedProducts
          : fallbackProducts

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: nextMessageId(),
          role: 'assistant',
          content:
            String(aiResponse.reply || '').trim() ||
            'Mình đã tìm được một số sản phẩm phù hợp trong kho Nexora.',
          recommendedProducts: nextRecommendedProducts,
        },
      ])
      setConversationContext(normalizeConversationContextValue(aiResponse.conversationContext) || conversationContext)
    } catch {
      const catalog = await ensureProductCatalogLoaded()
      const fallbackProducts = pickFallbackProducts(trimmedQuestion, catalog)

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: nextMessageId(),
          role: 'assistant',
          content:
            fallbackProducts.length > 0
              ? 'Mình đang lọc thêm vài mẫu hợp với nhu cầu của bạn.'
              : 'Mình chưa lấy được dữ liệu kho Nexora lúc này. Bạn thử gửi lại sau hoặc đổi 1-2 tiêu chí chính nhé.',
          recommendedProducts: fallbackProducts,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    submitQuestion(question)
  }

  function handleQuestionKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }

    event.preventDefault()
    submitQuestion(question)
  }

  const renderedMessages = isLoading
    ? [
        ...messages,
        {
          id: 'typing-indicator',
          role: 'assistant',
          content: normalizeAssistantCopy('Nexora đang suy nghĩ...'),
          isTyping: true,
          recommendedProducts: [],
        },
      ]
    : messages

  return (
    <section className="page-section ai-consultant-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Nexora</p>
          <h1>Tư vấn toàn màn hình</h1>
          <p className="section-subtitle">Bấm vào một phiên bên trái để mở lại đúng cuộc trò chuyện cũ.</p>
        </div>

      </div>

      <div className="ai-consultant-layout">
        <aside className="ai-consultant-history">
          <div className="ai-consultant-history-header">
            <div>
              <p className="eyebrow">Lịch sử chat</p>
              <h2>Phiên gần đây</h2>
            </div>
            <button
              type="button"
              className="ai-consultant-history-new"
              onClick={handleStartNewChat}
              aria-label="Tạo hội thoại mới"
              title="Tạo hội thoại mới"
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
            </button>
          </div>

          <div className="ai-consultant-history-list">
            {sortedHistorySessions.length > 0 ? (
              sortedHistorySessions.map((session) => {
                const isActive = String(session.id) === String(activeSessionId)
                return (
                  <div
                    key={session.id}
                    className={`ai-consultant-history-item ${isActive ? 'active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSession(session.id)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') {
                        return
                      }

                      event.preventDefault()
                      handleSelectSession(session.id)
                    }}
                  >
                    <strong>{session.title || 'Cuộc trò chuyện mới'}</strong>
                    <button
                      type="button"
                      className="ai-consultant-history-delete"
                      aria-label={`Xóa ${session.title || 'cuộc trò chuyện'}`}
                      title="Xóa đoạn hội thoại"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleDeleteSession(session.id)
                      }}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                  </div>
                )
              })
            ) : (
              <div className="ai-consultant-history-empty">Chưa có lịch sử chat nào.</div>
            )}
          </div>
        </aside>

        <div className="ai-consultant-shell">
          <div className="ai-consultant-shell-header">
            <div>
              <p className="eyebrow">Nexora</p>
              <h2>Hội thoại hiện tại</h2>
            </div>
            <button
              type="button"
              className="button button-secondary button-small ai-consultant-reset"
              onClick={handleStartNewChat}
              disabled={isLoading && messages.length <= 1}
            >
              Đặt lại hội thoại
            </button>
          </div>

          <div className="ai-consultant-messages">
            {hasMessages
              ? renderedMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`ai-message ${message.role === 'user' ? 'user' : 'assistant'} ${
                      message.isTyping ? 'typing' : ''
                    } ${
                      message.role === 'assistant' &&
                      Array.isArray(message.recommendedProducts) &&
                      message.recommendedProducts.length > 0
                        ? 'has-products'
                        : ''
                    }`}
                  >
                    <span className="ai-message-role">{message.role === 'user' ? 'Bạn' : 'Nexora'}</span>
                    <p style={{ whiteSpace: 'pre-line' }}>{message.content}</p>

                    {message.role === 'assistant' &&
                    Array.isArray(message.recommendedProducts) &&
                    message.recommendedProducts.length > 0 ? (
                      <div className="ai-product-results">
                        {message.recommendedProducts.slice(0, 5).map((product) => (
                          <article key={`${message.id}-${product.id}`} className="ai-product-result-item">
                            <img src={product.image || PRODUCT_FALLBACK_IMAGE} alt={product.name} loading="lazy" />
                            <div className="ai-product-result-body">
                              <div className="ai-product-result-copy">
                                <strong>{product.name}</strong>
                                <span>{getProductCategoryLabel(product.category)}</span>
                                <StarRating
                                  value={product.averageRating}
                                  reviewCount={product.totalReviews}
                                  readonly
                                  size="xs"
                                  showValue={product.totalReviews > 0}
                                  ariaLabel={`Đánh giá của ${product.name}`}
                                />
                                <p>{formatCurrency(product.price)}</p>
                                <small>{product.stock > 0 ? `Còn hàng: ${product.stock}` : 'Tạm hết hàng'}</small>
                              </div>
                              <div className="ai-product-result-actions">
                                <Link to={`/products/${product.id}`} className="button button-small">
                                  Xem chi tiết
                                </Link>
                                <button
                                  type="button"
                                  className="button button-small"
                                  onClick={() => handleAddProductToCart(product)}
                                >
                                  Thêm vào giỏ
                                </button>
                                <button
                                  type="button"
                                  className="button button-small button-secondary"
                                  onClick={() => handleAddProductToCompare(product)}
                                >
                                  So sánh
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              : null}
          </div>

          <form className="ai-consultant-form" onSubmit={handleSubmit}>
            <div className="ai-quick-chips" aria-label="Gợi ý nhanh">
              {QUICK_SUGGESTION_CHIPS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="ai-quick-chip"
                  onClick={() => {
                    setQuestion(suggestion)
                    submitQuestion(suggestion)
                  }}
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <textarea
              rows="4"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              placeholder="Ví dụ: Tôi cần laptop học lập trình dưới 25 triệu, pin tốt, nhẹ"
              disabled={isLoading}
            />

            <div className="ai-consultant-form-actions">
              <button type="submit" className="button" disabled={isLoading || !question.trim()}>
                {isLoading ? 'Đang tư vấn...' : 'Gửi tư vấn'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default NexoraConsultant
