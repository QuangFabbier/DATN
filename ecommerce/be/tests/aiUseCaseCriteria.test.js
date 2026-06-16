import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildUseCaseFitTexts,
  detectUseCaseProfile,
  resolveBestUseCaseProfile,
  scoreUseCaseFit,
} from '../services/aiUseCaseCriteriaService.js'

describe('AI use case criteria', () => {
  it('detects the correct use-case profile from user-like messages', () => {
    const cases = [
      { message: 'toi can laptop hoc tap duoi 20 trieu', expected: 'study' },
      { message: 'may nay co choi game fps tot khong', expected: 'gaming' },
      { message: 'dien thoai chup anh quay video dep', expected: 'photography' },
      { message: 'can may co pin trau va sac nhanh', expected: 'battery' },
      { message: 'may tinh van phong email excel word', expected: 'office' },
      { message: 'may gon nhe de mang theo di cong tac', expected: 'compact' },
    ]

    for (const testCase of cases) {
      assert.equal(detectUseCaseProfile({}, testCase.message), testCase.expected)
    }
  })

  it('scores products by the right scenario and keeps price-first decisions available downstream', () => {
    const studyLaptop = {
      name: 'Acer Aspire 5 i5 16GB 512GB',
      category: 'Laptop',
      description: 'Laptop hoc tap, pin on, de mang theo',
      price: 15990000,
      specs: [
        { label: 'RAM', value: '16GB' },
        { label: 'SSD', value: '512GB' },
        { label: 'Pin', value: '8 gio' },
      ],
      tags: ['hoc tap', 'van phong'],
    }

    const gamingLaptop = {
      name: 'Acer Nitro V 15 RTX 4050 144Hz',
      category: 'Laptop',
      description: 'Laptop gaming, RTX 4050, tan nhiet tot',
      price: 24990000,
      specs: [
        { label: 'GPU', value: 'RTX 4050' },
        { label: 'Man hinh', value: '144Hz' },
      ],
      tags: ['gaming', 'fps'],
    }

    const photoPhone = {
      name: 'OPPO Find X9 Pro 512GB',
      category: 'Phone',
      description: 'Dien thoai chup anh, zoom, OIS, quay video dep',
      price: 24990000,
      specs: [
        { label: 'Camera', value: '50MP OIS' },
        { label: 'Zoom', value: 'Periscope tele' },
      ],
      tags: ['camera', 'photo'],
    }

    const batteryPhone = {
      name: 'vivo Y39 128GB',
      category: 'Phone',
      description: 'Pin trau, sac nhanh, dung lau',
      price: 6990000,
      specs: [
        { label: 'Pin', value: '6500mAh' },
        { label: 'Sac nhanh', value: '44W' },
      ],
      tags: ['pin', 'travel'],
    }

    const officeLaptop = {
      name: 'Lenovo IdeaPad Slim 3 14',
      category: 'Laptop',
      description: 'Laptop van phong gon nhe, pin on, webcam',
      price: 13990000,
      specs: [
        { label: 'RAM', value: '16GB' },
        { label: 'Man hinh', value: '14 inch' },
      ],
      tags: ['van phong', 'excel', 'word'],
    }

    const compactLaptop = {
      name: 'ASUS Zenbook 14 OLED UX3405',
      category: 'Laptop',
      description: 'Laptop compact, mong nhe, de mang theo',
      price: 22990000,
      specs: [
        { label: 'Trong luong', value: '1.2kg' },
        { label: 'Man hinh', value: '14 inch OLED' },
      ],
      tags: ['gon nhe', 'portable'],
    }

    assert.equal(scoreUseCaseFit(studyLaptop, 'study').score > scoreUseCaseFit(gamingLaptop, 'study').score, true)
    assert.equal(scoreUseCaseFit(gamingLaptop, 'gaming').score > scoreUseCaseFit(studyLaptop, 'gaming').score, true)
    assert.equal(scoreUseCaseFit(photoPhone, 'photography').score > scoreUseCaseFit(batteryPhone, 'photography').score, true)
    assert.equal(scoreUseCaseFit(batteryPhone, 'battery').score > scoreUseCaseFit(photoPhone, 'battery').score, true)
    assert.equal(scoreUseCaseFit(officeLaptop, 'office').score > scoreUseCaseFit(gamingLaptop, 'office').score, true)
    assert.equal(scoreUseCaseFit(compactLaptop, 'compact').score > scoreUseCaseFit(gamingLaptop, 'compact').score, true)
  })

  it('returns all Nexora fit text buckets for a product', () => {
    const fitTexts = buildUseCaseFitTexts({
      name: 'Acer Aspire 5 i5 16GB 512GB',
      category: 'Laptop',
      description: 'Laptop hoc tap, pin on, de mang theo',
      price: 15990000,
      specs: [
        { label: 'RAM', value: '16GB' },
        { label: 'SSD', value: '512GB' },
      ],
      tags: ['hoc tap', 'van phong'],
    })

    assert.deepEqual(Object.keys(fitTexts).sort(), [
      'battery',
      'compact',
      'gaming',
      'office',
      'photography',
      'study',
    ])

    for (const value of Object.values(fitTexts)) {
      assert.equal(typeof value, 'string')
      assert.equal(value.length > 0, true)
    }
  })

  it('prefers gaming or compact for a keyboard product instead of forcing study', () => {
    const keyboard = {
      name: 'Razer Huntsman Mini',
      category: 'Keyboard',
      description: 'Ban phim co, switch quang hoc, RGB, anti ghosting, rapid trigger',
      price: 2690000,
      specs: [
        { label: 'Switch', value: 'Optical' },
        { label: 'Layout', value: '60%' },
      ],
      tags: ['keyboard', 'gaming', 'compact'],
    }

    const gamingScore = scoreUseCaseFit(keyboard, 'gaming').score
    const compactScore = scoreUseCaseFit(keyboard, 'compact').score
    const studyScore = scoreUseCaseFit(keyboard, 'study').score

    assert.equal(gamingScore > studyScore, true)
    assert.equal(compactScore > studyScore, true)
    assert.equal(['gaming', 'compact'].includes(resolveBestUseCaseProfile(keyboard)), true)
  })
})
