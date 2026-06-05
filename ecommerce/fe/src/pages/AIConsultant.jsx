import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useCompare } from '../hooks/useCompare'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { getAIPreferences } from '../services/accountStorage'
import { chatWithAi, compareProductsWithAi } from '../services/aiService'
import { getProducts } from '../services/productService'
import { formatCurrency } from '../utils/formatCurrency'
import StarRating from '../components/StarRating'

const PRODUCT_FALLBACK_IMAGE = 'https://placehold.co/120x120/e5e7eb/111827?text=Nexora'
const MAX_WIDGET_PRODUCTS = 5

const QUICK_SUGGESTION_CHIPS = [
  'Laptop học lập trình dưới 25 triệu',
  'Tai nghe chống ồn',
  'Điện thoại pin trâu',
  'So sánh sản phẩm trong giỏ',
]

const CATEGORY_KEYWORD_RULES = [
  { category: 'dien thoai', keywords: ['dien thoai', 'phone', 'smartphone', 'mobile'] },
  { category: 'laptop', keywords: ['laptop', 'notebook', 'may tinh xach tay'] },
  { category: 'may tinh bang', keywords: ['tablet', 'may tinh bang', 'ipad'] },
  { category: 'phu kien', keywords: ['phu kien', 'accessory', 'chuot', 'ban phim', 'tai nghe'] },
  { category: 'man hinh', keywords: ['man hinh', 'monitor', 'display'] },
  { category: 'am thanh', keywords: ['tai nghe', 'loa', 'audio', 'chong on'] },
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

function isCompareIntent(question = '') {
  const normalizedQuestion = normalizeSearchText(question)
  return normalizedQuestion.includes('so sanh') || normalizedQuestion.includes('compare')
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

function AIConsultant() {
  const { user } = useAuth()
  const { addToCart, cartItems } = useCart()
  const { compareItems, toggleCompare } = useCompare()
  const { favoriteItems } = useFavorites()
  const { showToast } = useToast()

  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [productCatalog, setProductCatalog] = useState([])
  const messageIdRef = useRef(2)
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content:
        'Xin chào. Đây là AI Shopping Assistant toàn màn hình. Bạn cứ mô tả nhu cầu, mình sẽ lọc sản phẩm từ kho Nexora và tư vấn chi tiết.',
      recommendedProducts: [],
    },
  ])

  const hasMessages = useMemo(() => messages.length > 0, [messages.length])

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

  function pickCompareCandidates(questionText) {
    const normalizedQuestion = normalizeSearchText(questionText)
    const askCompareTray = normalizedQuestion.includes('compare') || normalizedQuestion.includes('danh sach compare')
    const askCart = normalizedQuestion.includes('gio')

    if (askCompareTray && compareItems.length >= 2) {
      return compareItems
    }

    if (askCart && cartItems.length >= 2) {
      return cartItems
    }

    if (compareItems.length >= 2) {
      return compareItems
    }

    if (cartItems.length >= 2) {
      return cartItems
    }

    return []
  }

  function resolvePickLabel(compareResult, pick = { productId: '' }) {
    const matched = compareResult.comparedProducts.find((item) => item.id === pick.productId)
    return matched ? matched.name : 'Chưa đủ dữ liệu'
  }

  function formatCompareAssistantMessage(compareResult) {
    const bestForStudyName = resolvePickLabel(compareResult, compareResult.bestForStudy)
    const bestForGamingName = resolvePickLabel(compareResult, compareResult.bestForGaming)
    const bestValueName = resolvePickLabel(compareResult, compareResult.bestValue)

    return [
      compareResult.summary,
      '',
      `Phù hợp học tập: ${bestForStudyName} - ${compareResult.bestForStudy.reason}`,
      `Phù hợp gaming: ${bestForGamingName} - ${compareResult.bestForGaming.reason}`,
      `Giá trị tốt: ${bestValueName} - ${compareResult.bestValue.reason}`,
      '',
      compareResult.recommendation,
    ]
      .filter(Boolean)
      .join('\n')
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

    setMessages((currentMessages) => [...currentMessages, userMessage])
    setQuestion('')
    setIsLoading(true)

    try {
      if (isCompareIntent(trimmedQuestion)) {
        const compareCandidates = pickCompareCandidates(trimmedQuestion)

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
            content: 'Mình cần ít nhất 2 sản phẩm hợp lệ trong giỏ hoặc danh sách compare để so sánh.',
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

  function handleQuickChipSelect(suggestion) {
    setQuestion(suggestion)
    submitQuestion(suggestion)
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
    <section className="page-section ai-consultant-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AI Shopping Assistant</p>
          <h1>Tư vấn toàn màn hình</h1>
        </div>
      </div>

      <div className="ai-consultant-shell">
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
                  <span className="ai-message-role">{message.role === 'user' ? 'Bạn' : 'AI'}</span>
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
                              <span>{product.category}</span>
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
                onClick={() => handleQuickChipSelect(suggestion)}
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
            <button type="submit" className="button" disabled={isLoading}>
              {isLoading ? 'Đang tư vấn...' : 'Gửi tư vấn'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default AIConsultant
