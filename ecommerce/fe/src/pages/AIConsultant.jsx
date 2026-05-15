import { useState } from 'react'

const suggestionRules = [
  {
    keyword: 'học',
    message: 'Bạn có thể tham khảo laptop Dell Inspiron 15 hoặc Galaxy Tab S9 FE cho nhu cầu học tập.',
  },
  {
    keyword: 'làm việc',
    message: 'Bạn có thể kết hợp màn hình LG 24 inch, bàn phím Keychron K2 và chuột MX Master 3S.',
  },
  {
    keyword: 'nghe nhạc',
    message: 'Tai nghe Sony WH-CH520 hoặc loa JBL Flip 6 phù hợp cho nhu cầu âm thanh.',
  },
]

function AIConsultant() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  function handleConsult() {
    const normalizedQuestion = question.toLowerCase()
    const matchedRule = suggestionRules.find((rule) => normalizedQuestion.includes(rule.keyword))

    // Logic tạm thời, sau này có thể thay bằng API AI thật.
    setAnswer(
      matchedRule?.message ||
        'Bạn hãy nhập rõ nhu cầu như học tập, làm việc, nghe nhạc hoặc ngân sách để hệ thống tư vấn chính xác hơn.',
    )
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tư vấn sản phẩm</p>
          <h1>AI Consultant</h1>
        </div>
      </div>

      <div className="consultant-card">
        <label>
          Nhu cầu của bạn
          <textarea
            rows="5"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ví dụ: Tôi cần thiết bị để học online và làm bài tập..."
          />
        </label>
        <button type="button" className="button" onClick={handleConsult}>
          Nhận tư vấn
        </button>

        {answer && (
          <div className="ai-answer">
            <h2>Gợi ý</h2>
            <p>{answer}</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AIConsultant
