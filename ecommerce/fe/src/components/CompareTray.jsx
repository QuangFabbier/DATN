import { useRef, useState } from 'react'
import { compareProductsWithAi } from '../services/aiService'
import { useCompare } from '../hooks/useCompare'
import { useToast } from '../hooks/useToast'
import { formatCompareAssistantMessage } from '../utils/aiConversation'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductCategoryLabel } from '../utils/product'
import StarRating from './StarRating'

const AI_ACTION_COOLDOWN_MS = 2000

function CompareTray() {
  const { clearCompare, compareItems, isCompareOpen, removeCompare, setIsCompareOpen } = useCompare()
  const { showToast } = useToast()

  const [compareUseCase, setCompareUseCase] = useState('')
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
  const [aiCompareError, setAiCompareError] = useState('')
  const [aiCompareResult, setAiCompareResult] = useState(null)
  const lastAiRequestAtRef = useRef(0)
  const lastAiPayloadRef = useRef('')

  if (!compareItems.length) {
    return null
  }

  async function handleAiCompare() {
    if (isAiAnalyzing) {
      return
    }

    const now = Date.now()
    if (now - lastAiRequestAtRef.current < AI_ACTION_COOLDOWN_MS) {
      showToast({
        type: 'warning',
        title: 'Bạn thao tác hơi nhanh',
        message: 'Vui lòng chờ một chút trước khi gửi tiếp.',
      })
      return
    }

    if (compareItems.length < 2) {
      setAiCompareError('Bạn cần chọn ít nhất 2 sản phẩm để AI phân tích.')
      showToast({
        type: 'warning',
        title: 'Chưa đủ sản phẩm để so sánh',
        message: 'Hãy thêm ít nhất 2 sản phẩm trong khay compare.',
      })
      return
    }

    const productIds = compareItems.map((item) => item.id).filter(Boolean).slice(0, 5)
    const payloadSignature = `${productIds.join('|')}::${String(compareUseCase || '').trim().toLowerCase()}`

    if (payloadSignature && payloadSignature === lastAiPayloadRef.current && now - lastAiRequestAtRef.current < 5_000) {
      showToast({
        type: 'info',
        title: 'Yêu cầu vừa gửi rồi',
        message: 'Mình đã nhận đúng yêu cầu này, bạn chờ kết quả giúp nhé.',
      })
      return
    }

    lastAiRequestAtRef.current = now
    lastAiPayloadRef.current = payloadSignature

    setIsAiAnalyzing(true)
    setAiCompareError('')

    try {
      const result = await compareProductsWithAi({
        productIds,
        useCase: compareUseCase,
      })

      setAiCompareResult(result)
    } catch (error) {
      setAiCompareError(error?.message || 'Không thể phân tích so sánh bằng AI lúc này.')
      showToast({
        type: 'warning',
        title: 'AI so sánh tạm gián đoạn',
        message: error?.message || 'Vui lòng thử lại sau ít phút.',
      })
    } finally {
      setIsAiAnalyzing(false)
    }
  }

  return (
    <>
      <div className="compare-tray">
        <div className="compare-tray-copy">
          <p className="eyebrow">So sánh nhanh</p>
          <strong>{compareItems.length}/3 sản phẩm đang chờ</strong>
        </div>

        <div className="compare-tray-items">
          {compareItems.map((item) => (
            <article key={item.id} className="compare-tray-item">
              <img src={item.image} alt={item.name} />
              <div>
                <p>{item.name}</p>
                <span>{formatCurrency(item.price)}</span>
                <StarRating
                  value={item.averageRating}
                  reviewCount={item.totalReviews}
                  readonly
                  size="xs"
                  showValue={item.totalReviews > 0}
                  ariaLabel={`Đánh giá của ${item.name}`}
                />
              </div>
              <button
                type="button"
                className="icon-button subtle button-danger"
                onClick={() => removeCompare(item.id)}
                aria-label={`Bỏ ${item.name} khỏi danh sách so sánh`}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>

        <div className="compare-tray-actions">
          <button type="button" className="button button-danger" onClick={clearCompare}>
            Xóa hết
          </button>
          <button type="button" className="button" onClick={() => setIsCompareOpen(true)}>
            So sánh ngay
          </button>
        </div>
      </div>

      {isCompareOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCompareOpen(false)}>
          <section
            className="modal-card compare-modal"
            onClick={(event) => event.stopPropagation()}
            aria-label="So sánh sản phẩm"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Compare</p>
                <h2>Bảng so sánh sản phẩm</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsCompareOpen(false)}
                aria-label="Đóng bảng so sánh"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="compare-table-wrapper">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Tiêu chí</th>
                    {compareItems.map((item) => (
                      <th key={item.id}>
                        <div className="compare-product-head">
                          <img src={item.image} alt={item.name} />
                          <strong>{item.name}</strong>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Giá</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-price`}>{formatCurrency(item.price)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Đánh giá</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-rating`}>
                        <StarRating
                          value={item.averageRating}
                          reviewCount={item.totalReviews}
                          readonly
                          size="sm"
                          showValue={item.totalReviews > 0}
                          ariaLabel={`Đánh giá của ${item.name}`}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Danh mục</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-category`}>{getProductCategoryLabel(item.category)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Tồn kho</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-stock`}>{item.stock ?? 'Đang cập nhật'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Mô tả</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-description`}>{item.description || 'Chưa có mô tả.'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="consultant-card compare-ai-card">
              <div className="form-card-header">
                <p className="eyebrow">Nexora Smart Compare</p>
                <h3>Nexora phân tích giúp bạn</h3>
                <p>Bạn có thể nhập ngắn nhu cầu chính để Nexora so sánh sát hơn.</p>
              </div>

              <label>
                Nhu cầu ưu tiên (tùy chọn)
                <input
                  type="text"
                  value={compareUseCase}
                  onChange={(event) => setCompareUseCase(event.target.value)}
                  placeholder="Ví dụ: học lập trình, gaming, văn phòng"
                  disabled={isAiAnalyzing}
                />
              </label>

              <div className="summary-actions">
                <button type="button" className="button" onClick={handleAiCompare} disabled={isAiAnalyzing}>
                  {isAiAnalyzing ? 'Nexora đang phân tích...' : 'Nexora phân tích giúp tôi'}
                </button>
              </div>

              {aiCompareError ? <p className="field-error">{aiCompareError}</p> : null}

              {aiCompareResult ? (
                <div className="ai-answer compare-ai-answer">
                  <pre className="compare-ai-formatted">{formatCompareAssistantMessage(aiCompareResult)}</pre>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

export default CompareTray
