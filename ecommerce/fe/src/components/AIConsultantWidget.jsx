import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { getAIPreferences } from '../services/accountStorage'
import { chatWithAi } from '../services/aiService'
import { getProducts } from '../services/productService'
import { formatCurrency } from '../utils/formatCurrency'

const AI_WIDGET_OPEN_EVENT = 'open-ai-consultant-widget'
const PRODUCT_FALLBACK_IMAGE = 'https://placehold.co/120x120/e5e7eb/111827?text=Nexora'
const MAX_WIDGET_PRODUCTS = 5

const CATEGORY_KEYWORD_RULES = [
  { category: 'điện thoại', keywords: ['điện thoại', 'dien thoai', 'phone', 'smartphone', 'mobile'] },
  { category: 'laptop', keywords: ['laptop', 'notebook', 'máy tính xách tay', 'may tinh xach tay'] },
  { category: 'máy tính bảng', keywords: ['tablet', 'máy tính bảng', 'may tinh bang', 'ipad'] },
  { category: 'phụ kiện', keywords: ['phụ kiện', 'phu kien', 'accessory', 'chuột', 'bàn phím', 'tai nghe'] },
  { category: 'màn hình', keywords: ['màn hình', 'man hinh', 'monitor', 'display'] },
]

const suggestionRules = [
  {
    keyword: 'học',
    message:
      'Bạn có thể tham khảo Dell Inspiron 15 3530, Galaxy Tab S9 FE hoặc đèn bàn LED chống cận cho nhu cầu học tập.',
  },
  {
    keyword: 'làm việc',
    message:
      'Bạn có thể kết hợp màn hình Dell P2422H, bàn phím Keychron K2 và chuột Logitech MX Master 3S cho góc làm việc hiệu quả.',
  },
  {
    keyword: 'nghe nhạc',
    message:
      'Sony WH-CH520, AirPods 3 hoặc loa JBL Flip 6 là các lựa chọn phù hợp nếu bạn ưu tiên giải trí và di động.',
  },
  {
    keyword: 'chơi game',
    message:
      'Bạn có thể bắt đầu với màn hình lớn hơn, tai nghe không dây và laptop hiệu năng cao như MacBook Air M2 hoặc một mẫu Windows mạnh hơn.',
  },
  {
    keyword: 'rẻ',
    message:
      'Nếu cần tối ưu chi phí, bạn có thể xem Redmi Note 13, đèn bàn LED chống cận hoặc sạc dự phòng Anker 20000mAh.',
  },
]

function buildReply(question) {
  const normalizedQuestion = question.toLowerCase()
  const matchedRule = suggestionRules.find((rule) => normalizedQuestion.includes(rule.keyword))

  return (
    matchedRule?.message ||
    'Mình có thể hiển thị nhanh danh sách sản phẩm theo loại bạn muốn, ví dụ: điện thoại, laptop, tablet hoặc phụ kiện.'
  )
}

function normalizeContextProducts(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.slice(0, 10).map((item) => ({
    id: String(item?.id || ''),
    name: String(item?.name || ''),
    category: String(item?.category || ''),
    price: Number(item?.price || 0),
    quantity: Number(item?.quantity || 1),
  }))
}

function formatAssistantResponse(reply = '', recommendedProducts = []) {
  const normalizedReply = String(reply || '').trim()

  if (!Array.isArray(recommendedProducts) || recommendedProducts.length === 0) {
    return normalizedReply || 'Hiện chưa có gợi ý phù hợp từ dữ liệu sản phẩm.'
  }

  return normalizedReply || 'Mình đã tìm được một số sản phẩm phù hợp trong kho Nexora.'
}

function normalizeSearchText(value = '') {
  return String(value || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

function isViewProductsIntent(question = '') {
  const normalizedQuestion = normalizeSearchText(question)
  const intentKeywords = [
    'xem',
    'danh sach',
    'list',
    'show',
    'co gi',
    'san pham',
    'hang',
    'shop co',
  ]

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
    }))
}

function AIConsultantWidget() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cartItems } = useCart()
  const { favoriteItems } = useFavorites()

  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [productCatalog, setProductCatalog] = useState([])
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Xin chào. Hãy mô tả nhu cầu, tôi sẽ gợi ý sản phẩm phù hợp trong shop.',
    },
  ])

  useEffect(() => {
    function handleOpenWidget() {
      setIsOpen(true)
    }

    window.addEventListener(AI_WIDGET_OPEN_EVENT, handleOpenWidget)

    return () => {
      window.removeEventListener(AI_WIDGET_OPEN_EVENT, handleOpenWidget)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadProductCatalog() {
      try {
        const products = await getProducts()

        if (!isMounted) {
          return
        }

        setProductCatalog(Array.isArray(products) ? products : [])
      } catch {
        if (isMounted) {
          setProductCatalog([])
        }
      }
    }

    loadProductCatalog()

    return () => {
      isMounted = false
    }
  }, [])

  const hasMessages = useMemo(() => messages.length > 0, [messages.length])

  function navigateToProductsFromAi(questionText, recommendedProducts = []) {
    if (!Array.isArray(recommendedProducts) || recommendedProducts.length === 0) {
      return
    }

    const aiIds = recommendedProducts
      .map((product) => String(product?.id || '').trim())
      .filter(Boolean)

    if (aiIds.length === 0) {
      return
    }

    const nextParams = new URLSearchParams()
    nextParams.set('aiIds', aiIds.join(','))
    nextParams.set('fromAI', '1')

    const normalizedQuestion = String(questionText || '').trim()
    if (normalizedQuestion) {
      nextParams.set('aiQuery', normalizedQuestion)
    }

    navigate(`/products?${nextParams.toString()}`)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isLoading) {
      return
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: trimmedQuestion,
    }

    setMessages((currentMessages) => [...currentMessages, userMessage])
    setQuestion('')
    setIsOpen(true)
    setIsLoading(true)

    try {
      const aiContext = {
        cartItems: normalizeContextProducts(cartItems),
        favoriteItems: normalizeContextProducts(favoriteItems),
        aiPreferences: getAIPreferences(user),
      }

      const aiResponse = await chatWithAi({
        message: trimmedQuestion,
        context: aiContext,
      })

      const fallbackProducts = pickFallbackProducts(trimmedQuestion, productCatalog)
      const nextRecommendedProducts =
        Array.isArray(aiResponse.recommendedProducts) && aiResponse.recommendedProducts.length > 0
          ? aiResponse.recommendedProducts
          : fallbackProducts

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: formatAssistantResponse(aiResponse.reply, nextRecommendedProducts),
        recommendedProducts: nextRecommendedProducts,
      }

      setMessages((currentMessages) => [...currentMessages, assistantMessage])
      navigateToProductsFromAi(trimmedQuestion, nextRecommendedProducts)
    } catch {
      const fallbackProducts = pickFallbackProducts(trimmedQuestion, productCatalog)
      const fallbackMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content:
          fallbackProducts.length > 0
            ? 'Mình hiển thị nhanh các sản phẩm bạn có thể quan tâm trong shop:'
            : buildReply(trimmedQuestion),
        recommendedProducts: fallbackProducts,
      }

      setMessages((currentMessages) => [...currentMessages, fallbackMessage])
      navigateToProductsFromAi(trimmedQuestion, fallbackProducts)
    } finally {
      setIsLoading(false)
    }
  }

  function handleQuestionKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }

    event.preventDefault()
    handleSubmit(event)
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
    <div className={`ai-widget ${isOpen ? 'open' : ''}`}>
      <section className="ai-widget-panel" aria-label="Tư vấn AI" aria-hidden={!isOpen}>
        <div className="ai-widget-header">
          <div>
            <p className="eyebrow">Tư vấn sản phẩm</p>
            <h2>AI Consultant</h2>
          </div>
          <button
            type="button"
            className="ai-widget-toggle"
            onClick={() => setIsOpen(false)}
            aria-label="Thu nhỏ hộp chat"
            tabIndex={isOpen ? 0 : -1}
          >
            -
          </button>
        </div>

        <div className="ai-widget-messages">
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
                  <span className="ai-message-role">{message.role === 'user' ? 'Bạn' : 'AI'}</span>
                  <p style={{ whiteSpace: 'pre-line' }}>{message.content}</p>
                  {message.role === 'assistant' &&
                  Array.isArray(message.recommendedProducts) &&
                  message.recommendedProducts.length > 0 ? (
                    <div className="ai-product-results">
                      {message.recommendedProducts.slice(0, 5).map((product) => (
                        <Link
                          key={`${message.id}-${product.id}`}
                          to={`/products/${product.id}`}
                          className="ai-product-result-item"
                        >
                          <img
                            src={product.image || PRODUCT_FALLBACK_IMAGE}
                            alt={product.name}
                            loading="lazy"
                          />
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.category}</span>
                            <p>{formatCurrency(product.price)}</p>
                            <small>
                              {product.stock > 0 ? `Còn hàng: ${product.stock}` : 'Tạm hết hàng'}
                            </small>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            : null}
        </div>

        <form className="ai-widget-form" onSubmit={handleSubmit}>
          <textarea
            rows="3"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder="Ví dụ: Tôi cần thiết bị để học online, ngân sách khoảng 15 triệu..."
            tabIndex={isOpen ? 0 : -1}
            disabled={isLoading}
          />
          <button type="submit" className="button" tabIndex={isOpen ? 0 : -1} disabled={isLoading}>
            {isLoading ? 'Đang tư vấn...' : 'Gửi tư vấn'}
          </button>
        </form>
      </section>

      <button
        type="button"
        className="ai-widget-fab"
        onClick={() => setIsOpen((currentState) => !currentState)}
        aria-label="Mở tư vấn AI"
      >
        AI
      </button>
    </div>
  )
}

export default AIConsultantWidget
export { AI_WIDGET_OPEN_EVENT }
