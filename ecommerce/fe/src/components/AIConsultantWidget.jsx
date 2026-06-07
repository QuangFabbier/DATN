import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useCompare } from '../hooks/useCompare'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { getAIPreferences } from '../services/accountStorage'
import { chatWithAi } from '../services/aiService'
import { getProducts } from '../services/productService'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductCategoryLabel } from '../utils/product'
import {
  canUseStorage,
  getScopedStorageKey,
  readScopedStorageJSON,
  writeScopedStorageJSON,
} from '../utils/storageScope'
import StarRating from './StarRating'

const PRODUCT_FALLBACK_IMAGE = 'https://placehold.co/120x120/e5e7eb/111827?text=Nexora'
const MAX_WIDGET_PRODUCTS = 5
const AI_WIDGET_MINIMIZED_FLAG_KEY_PREFIX = 'nexora.ai.widget.minimized'
const AI_CONSULTANT_SESSION_STORAGE_KEY_PREFIX = 'nexora.ai.consultant.session.v1'
const DEFAULT_ASSISTANT_MESSAGE = {
  id: 1,
  role: 'assistant',
  content:
    'Xin chào. Mình là AI Shopping Assistant. Bạn mô tả nhanh nhu cầu, mình sẽ gợi ý sản phẩm phù hợp ngay tại đây.',
  recommendedProducts: [],
}

const QUICK_SUGGESTION_CHIPS = [
  'Laptop học lập trình dưới 25 triệu',
  'Điện thoại pin trâu',
  'Tai nghe chống ồn',
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

function readPersistedConsultantSession(user) {
  if (!canUseStorage()) {
    return null
  }

  try {
    const parsedSession = readScopedStorageJSON(
      window.sessionStorage,
      AI_CONSULTANT_SESSION_STORAGE_KEY_PREFIX,
      null,
      user,
    )

    if (!parsedSession || typeof parsedSession !== 'object') {
      return null
    }

    const question = typeof parsedSession?.question === 'string' ? parsedSession.question : ''
    const persistedConversationContext =
      parsedSession?.conversationContext && typeof parsedSession.conversationContext === 'object'
        ? parsedSession.conversationContext
        : null
    const rawMessages = Array.isArray(parsedSession?.messages) ? parsedSession.messages : []
    const normalizedMessages = rawMessages
      .map((message, index) => ({
        id: Number.isFinite(Number(message?.id)) ? Number(message.id) : index + 1,
        role: message?.role === 'user' ? 'user' : 'assistant',
        content: String(message?.content || ''),
        recommendedProducts: Array.isArray(message?.recommendedProducts) ? message.recommendedProducts : [],
      }))
      .filter((message) => message.content.trim().length > 0)

    if (normalizedMessages.length === 0) {
      return null
    }

    return {
      question,
      messages: normalizedMessages,
      conversationContext: persistedConversationContext,
    }
  } catch {
    return null
  }
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

function AIConsultantWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToCart, cartItems } = useCart()
  const { favoriteItems } = useFavorites()
  const { toggleCompare } = useCompare()
  const { showToast } = useToast()

  const isConsultantFullPage = location.pathname === '/ai-consultant'
  const persistedSession = useMemo(() => readPersistedConsultantSession(user), [user])
  const messageListRef = useRef(null)
  const messageIdRef = useRef(2)
  const minimizedStorageKey = useMemo(
    () => getScopedStorageKey(AI_WIDGET_MINIMIZED_FLAG_KEY_PREFIX, user),
    [user],
  )

  const [isOpen, setIsOpen] = useState(false)
  const [hasPendingResumeSession, setHasPendingResumeSession] = useState(() => {
    if (!canUseStorage()) {
      return false
    }

    return window.sessionStorage.getItem(getScopedStorageKey(AI_WIDGET_MINIMIZED_FLAG_KEY_PREFIX, user)) === '1'
  })
  const [question, setQuestion] = useState(() => persistedSession?.question || '')
  const [messages, setMessages] = useState(() => persistedSession?.messages || [DEFAULT_ASSISTANT_MESSAGE])
  const [conversationContext, setConversationContext] = useState(() =>
    normalizeConversationContextValue(persistedSession?.conversationContext),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [productCatalog, setProductCatalog] = useState([])

  useEffect(() => {
    queueMicrotask(() => {
      setQuestion(persistedSession?.question || '')
      setMessages(persistedSession?.messages || [DEFAULT_ASSISTANT_MESSAGE])
      setConversationContext(normalizeConversationContextValue(persistedSession?.conversationContext))
    })
  }, [persistedSession])

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

    writeScopedStorageJSON(
      window.sessionStorage,
      AI_CONSULTANT_SESSION_STORAGE_KEY_PREFIX,
      {
        question,
        messages,
        conversationContext,
      },
      user,
    )
  }, [messages, question, conversationContext, user])

  useEffect(() => {
    if (!canUseStorage()) {
      return
    }

    queueMicrotask(() => {
      setHasPendingResumeSession(window.sessionStorage.getItem(minimizedStorageKey) === '1')
    })
  }, [location.pathname, location.search, minimizedStorageKey])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const listElement = messageListRef.current
    if (!listElement) {
      return
    }

    listElement.scrollTop = listElement.scrollHeight
  }, [isOpen, messages, isLoading])

  if (isConsultantFullPage) {
    return null
  }

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
              ? 'Hệ thống AI đang bận, mình hiển thị nhanh các sản phẩm có thể phù hợp cho bạn.'
              : 'Hiện tại mình chưa tư vấn tự động được. Bạn thử mô tả rõ hơn theo dạng: loại sản phẩm + ngân sách + ưu tiên nhé.',
          recommendedProducts: fallbackProducts,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleClearConversation() {
    setQuestion('')
    setIsLoading(false)
    setMessages([DEFAULT_ASSISTANT_MESSAGE])
    setConversationContext(null)

    if (canUseStorage()) {
      window.sessionStorage.removeItem(
        getScopedStorageKey(AI_CONSULTANT_SESSION_STORAGE_KEY_PREFIX, user),
      )
    }

    showToast({
      type: 'info',
      title: 'Đã xóa hội thoại',
      message: 'Bạn có thể bắt đầu phiên tư vấn mới.',
    })
  }

  function handleViewProductDetail(productId) {
    if (!productId) {
      return
    }

    if (canUseStorage()) {
      window.sessionStorage.setItem(minimizedStorageKey, '1')
    }

    setHasPendingResumeSession(true)
    setIsOpen(false)
    navigate(`/products/${productId}`)
  }

  function handleToggleWidget() {
    const nextIsOpen = !isOpen
    setIsOpen(nextIsOpen)

    if (nextIsOpen && canUseStorage()) {
      window.sessionStorage.removeItem(minimizedStorageKey)
      setHasPendingResumeSession(false)
    }
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
          content: 'AI đang soạn tư vấn...',
          isTyping: true,
          recommendedProducts: [],
        },
      ]
    : messages

  return (
    <div className={`ai-widget ai-widget-shortcut ${isOpen ? 'open' : ''}`}>
      <div className="ai-widget-panel" role="dialog" aria-label="AI tư vấn nhanh">
        <div className="ai-widget-header">
          <div>
            <p className="eyebrow">AI Assistant</p>
            <h2>Tư vấn nhanh</h2>
          </div>

          <div className="ai-widget-header-actions">
            <button
              type="button"
              className="ai-widget-toggle"
              onClick={handleClearConversation}
              disabled={isLoading}
              aria-label="Đặt lại hội thoại"
              title="Đặt lại hội thoại"
            >
              <i className="fa-solid fa-rotate-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ai-widget-toggle"
              onClick={() => navigate('/ai-consultant')}
              aria-label="Mở AI toàn màn hình"
            >
              <i className="fa-solid fa-up-right-from-square" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ai-widget-toggle"
              onClick={() => setIsOpen(false)}
              aria-label="Thu nhỏ chatbox"
            >
              <i className="fa-solid fa-minus" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div ref={messageListRef} className="ai-widget-messages">
          {renderedMessages.map((message) => (
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
              <span className="ai-message-role">{message.role === 'user' ? 'Bạn' : 'AI'}</span>
              <p style={{ whiteSpace: 'pre-line' }}>{message.content}</p>

              {message.role === 'assistant' &&
              Array.isArray(message.recommendedProducts) &&
              message.recommendedProducts.length > 0 ? (
                <div className="ai-product-results">
                  {message.recommendedProducts.slice(0, MAX_WIDGET_PRODUCTS).map((product) => (
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
                          <Link
                            to={`/products/${product.id}`}
                            className="button button-small"
                            onClick={(event) => {
                              event.preventDefault()
                              handleViewProductDetail(product.id)
                            }}
                          >
                            Xem chi tiết
                          </Link>
                          <button
                            type="button"
                            className="button button-small button-light"
                            onClick={() => handleAddProductToCart(product)}
                          >
                            Thêm giỏ
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
          ))}
        </div>

        <form
          className="ai-widget-form"
          onSubmit={(event) => {
            event.preventDefault()
            submitQuestion(question)
          }}
        >
          <div className="ai-quick-chips" aria-label="Gợi ý nhanh">
            {QUICK_SUGGESTION_CHIPS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="ai-quick-chip"
                onClick={() => submitQuestion(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <textarea
            rows="3"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder="Nhắn AI để tiếp tục tư vấn..."
            disabled={isLoading}
          />

          <div className="ai-widget-footer-actions">
            <button type="submit" className="button" disabled={isLoading || !question.trim()}>
              {isLoading ? 'Đang tư vấn...' : 'Gửi'}
            </button>
          </div>
        </form>
      </div>

      <button
        type="button"
        className={`ai-widget-fab ${hasPendingResumeSession ? 'ai-widget-fab-resume' : ''}`}
        onClick={handleToggleWidget}
        aria-label={isOpen ? 'Thu nhỏ AI tư vấn' : 'Mở AI tư vấn nhanh'}
      >
        AI
      </button>
    </div>
  )
}

export default AIConsultantWidget
