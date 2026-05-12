import { useEffect, useMemo, useState } from 'react'

const AI_WIDGET_OPEN_EVENT = 'open-ai-consultant-widget'

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
    'Bạn hãy mô tả rõ hơn nhu cầu như học tập, làm việc, nghe nhạc, ngân sách hoặc loại thiết bị để tôi gợi ý sát hơn.'
  )
}

function AIConsultantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
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

  const hasMessages = useMemo(() => messages.length > 0, [messages.length])

  function handleSubmit(event) {
    event.preventDefault()

    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      return
    }

    const nextMessages = [
      ...messages,
      {
        id: Date.now(),
        role: 'user',
        content: trimmedQuestion,
      },
      {
        id: Date.now() + 1,
        role: 'assistant',
        content: buildReply(trimmedQuestion),
      },
    ]

    setMessages(nextMessages)
    setQuestion('')
    setIsOpen(true)
  }

  return (
    <div className={`ai-widget ${isOpen ? 'open' : ''}`}>
      <section
        className="ai-widget-panel"
        aria-label="Tư vấn AI"
        aria-hidden={!isOpen}
      >
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
            ? messages.map((message) => (
                <article
                  key={message.id}
                  className={`ai-message ${message.role === 'user' ? 'user' : 'assistant'}`}
                >
                  <span className="ai-message-role">{message.role === 'user' ? 'Bạn' : 'AI'}</span>
                  <p>{message.content}</p>
                </article>
              ))
            : null}
        </div>

        <form className="ai-widget-form" onSubmit={handleSubmit}>
          <textarea
            rows="3"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ví dụ: Tôi cần thiết bị để học online, ngân sách khoảng 15 triệu..."
            tabIndex={isOpen ? 0 : -1}
          />
          <button type="submit" className="button" tabIndex={isOpen ? 0 : -1}>
            Gửi tư vấn
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
