import { describe, expect, it } from 'vitest'
import { extractComparisonCount, formatCompareAssistantMessage, resolveCompareCandidates } from './aiConversation'

describe('resolveCompareCandidates', () => {
  it('prefers the last assistant recommendations when the user references those items', () => {
    const messages = [
      {
        role: 'assistant',
        recommendedProducts: [
          { id: '1', name: 'Acer Aspire 5 i5 16GB 512GB', category: 'Laptop' },
          { id: '2', name: 'Dell Inspiron 15 3530 i5 16GB 512GB', category: 'Laptop' },
          { id: '3', name: 'HP Pavilion 15 i5 16GB 512GB', category: 'Laptop' },
          { id: '4', name: 'Lenovo LOQ 15 i7 RTX 4060', category: 'Laptop' },
        ],
      },
    ]

    const candidates = resolveCompareCandidates({
      question: 'so sánh 4 cái đó cho tôi',
      messages,
      compareItems: [
        { id: '9', name: 'Samsung Galaxy Watch 7 40mm', category: 'Smartwatch' },
        { id: '10', name: 'Lexar NM790 2TB', category: 'SSD' },
      ],
      cartItems: [],
      max: 5,
    })

    expect(candidates).toHaveLength(4)
    expect(candidates.map((item) => item.id)).toEqual(['1', '2', '3', '4'])
    expect(candidates.every((item) => item.category === 'Laptop')).toBe(true)
  })

  it('falls back to compare tray when there is no prior assistant shortlist', () => {
    const candidates = resolveCompareCandidates({
      question: 'so sánh 2 cái đầu',
      messages: [],
      compareItems: [
        { id: '9', name: 'Samsung Galaxy Watch 7 40mm', category: 'Smartwatch' },
        { id: '10', name: 'Lexar NM790 2TB', category: 'SSD' },
      ],
      cartItems: [],
      max: 5,
    })

    expect(candidates).toHaveLength(2)
    expect(candidates.map((item) => item.id)).toEqual(['9', '10'])
  })

  it('detects comparison counts from head and tail phrases', () => {
    expect(extractComparisonCount('so sánh 2 cái đầu')).toBe(2)
    expect(extractComparisonCount('so sánh 2 cái cuối')).toBe(2)
    expect(extractComparisonCount('so sánh 4 cái đó')).toBe(4)
  })

  it('formats compare answers into clear sections', () => {
    const message = formatCompareAssistantMessage({
      summary: 'Mình đã so sánh nhanh 4 mẫu laptop.',
      comparedProducts: [
        { id: '1', name: 'Acer Aspire 5 i5 16GB 512GB' },
        { id: '2', name: 'Dell Inspiron 15 3530 i5 16GB 512GB' },
      ],
      bestForStudy: { productId: '1', reason: 'giá mềm, hợp học tập' },
      bestForGaming: { productId: '2', reason: 'mạnh hơn cho gaming' },
      bestValue: { productId: '1', reason: 'cân bằng giữa giá và nhu cầu' },
      recommendation: 'Nên chọn Acer Aspire 5 nếu ưu tiên chi phí.',
    })

    expect(message).toContain('Tóm tắt:')
    expect(message).toContain('Mẫu nên chọn:')
    expect(message).toContain('Vì sao:')
    expect(message).toContain('Khi nào không nên mua:')
  })
})
