import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import app from '../app.js'
import connectDB from '../config/db.js'
import InventoryTransaction from '../models/InventoryTransaction.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { recordOrderCompletionInventory } from '../services/inventoryService.js'

const JWT_SECRET = 'inventory-test-secret'

let mongoServer
let httpServer
let baseUrl = ''
let adminUser
let customerUser
let adminToken = ''
let customerToken = ''
let laptopProduct
let mouseProduct
let cableProduct
let macBookProduct
let iphoneProduct
let airPodsProduct
let thinkPadProduct
let xpsProduct
let redmiProduct
let sonyHeadphoneProduct
let logitechMouseProduct

function createToken(userId) {
  return jwt.sign({ id: String(userId) }, JWT_SECRET, { expiresIn: '1h' })
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  }

  return fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

describe('Inventory module', () => {
  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET
    mongoServer = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: 'wiredTiger',
      },
    })
    process.env.MONGO_URI = mongoServer.getUri()

    await connectDB()

    adminUser = await User.create({
      name: 'Admin Inventory',
      email: 'admin.inventory@test.local',
      password: 'hashed-password',
      role: 'admin',
    })

    customerUser = await User.create({
      name: 'Customer Test',
      email: 'customer.inventory@test.local',
      password: 'hashed-password',
      role: 'customer',
    })

    adminToken = createToken(adminUser._id)
    customerToken = createToken(customerUser._id)

    laptopProduct = await Product.create({
      name: 'Laptop Nexora Pro 14',
      category: 'Laptop',
      brand: 'Nexora',
      description: 'San pham test ton kho',
      price: 20000000,
      stock: 5,
      minStockLevel: 10,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    mouseProduct = await Product.create({
      name: 'Mouse Nexora Silent',
      category: 'Phu kien',
      brand: 'Nexora',
      description: 'San pham test ton kho',
      price: 350000,
      stock: 1,
      minStockLevel: 8,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    cableProduct = await Product.create({
      name: 'Cable Nexora USB-C',
      category: 'Phu kien',
      brand: 'Nexora',
      description: 'San pham het hang',
      price: 120000,
      stock: 0,
      minStockLevel: 6,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    macBookProduct = await Product.create({
      name: 'MacBook Air 13 M4 16GB 256GB',
      category: 'Laptop',
      brand: 'Apple',
      description: 'May tinh xach tay Apple',
      price: 28000000,
      stock: 12,
      minStockLevel: 5,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    iphoneProduct = await Product.create({
      name: 'iPhone 16 128GB',
      category: 'Phone',
      brand: 'Apple',
      description: 'Dien thoai Apple',
      price: 22000000,
      stock: 18,
      minStockLevel: 5,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    airPodsProduct = await Product.create({
      name: 'AirPods Pro 2 USB-C',
      category: 'Headphones',
      brand: 'Apple',
      description: 'Tai nghe khong day Apple',
      price: 5990000,
      stock: 20,
      minStockLevel: 5,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    thinkPadProduct = await Product.create({
      name: 'Lenovo ThinkPad X1 Carbon Gen 13',
      category: 'Laptop',
      brand: 'Lenovo',
      description: 'Laptop doanh nghiep',
      price: 36000000,
      stock: 8,
      minStockLevel: 4,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    xpsProduct = await Product.create({
      name: 'Dell XPS 13 Ultra 7 16GB 512GB',
      category: 'Laptop',
      brand: 'Dell',
      description: 'Laptop cao cap',
      price: 39000000,
      stock: 7,
      minStockLevel: 4,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    redmiProduct = await Product.create({
      name: 'Redmi Note 15 Pro 256GB',
      category: 'Phone',
      brand: 'Xiaomi',
      description: 'Dien thoai Xiaomi',
      price: 9500000,
      stock: 15,
      minStockLevel: 5,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    sonyHeadphoneProduct = await Product.create({
      name: 'Sony WH-1000XM5',
      category: 'Headphones',
      brand: 'Sony',
      description: 'Tai nghe chong on',
      price: 7990000,
      stock: 11,
      minStockLevel: 4,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    logitechMouseProduct = await Product.create({
      name: 'Logitech G102 Lightsync',
      category: 'Mouse',
      brand: 'Logitech',
      description: 'Chuot choi game',
      price: 450000,
      stock: 30,
      minStockLevel: 8,
      image: '',
      images: [],
      specs: [],
      tags: [],
      useCases: [],
    })

    httpServer = app.listen(0)
    await new Promise((resolve) => {
      httpServer.once('listening', resolve)
    })
    baseUrl = `http://127.0.0.1:${httpServer.address().port}`
  })

  after(async () => {
    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    }

    await mongoose.disconnect()

    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  it('blocks customer access to inventory APIs', async () => {
    const response = await request('/api/inventory/dashboard', {
      token: customerToken,
    })

    assert.equal(response.status, 403)
  })

  it('confirms inventory import and increases stock inside transaction', async () => {
    const response = await request('/api/inventory/import', {
      method: 'POST',
      token: adminToken,
      body: {
        supplierName: 'Nha cung cap test',
        note: 'Nhap kho dau tien',
        status: 'CONFIRMED',
        items: [
          {
            productId: laptopProduct._id,
            quantity: 4,
            importPrice: 18000000,
          },
        ],
      },
    })

    assert.equal(response.status, 201)
    const payload = await response.json()
    assert.equal(payload.receipt.status, 'CONFIRMED')
    assert.equal(payload.receipt.items[0].stockBefore, 5)
    assert.equal(payload.receipt.items[0].stockAfter, 9)

    const updatedProduct = await Product.findById(laptopProduct._id)
    assert.equal(updatedProduct.stock, 9)

    const transactions = await InventoryTransaction.find({ referenceType: 'INVENTORY_IMPORT' }).lean()
    assert.equal(transactions.length, 1)
    assert.equal(transactions[0].stockBefore, 5)
    assert.equal(transactions[0].stockAfter, 9)
  })

  it('rolls back inventory import if a later item fails', async () => {
    const beforeStock = (await Product.findById(laptopProduct._id)).stock

    const response = await request('/api/inventory/import', {
      method: 'POST',
      token: adminToken,
      body: {
        supplierName: 'Rollback Supplier',
        status: 'CONFIRMED',
        items: [
          {
            productId: laptopProduct._id,
            quantity: 2,
            importPrice: 17000000,
          },
          {
            productId: new mongoose.Types.ObjectId().toString(),
            quantity: 1,
            importPrice: 1000000,
          },
        ],
      },
    })

    assert.equal(response.status, 404)

    const afterProduct = await Product.findById(laptopProduct._id)
    assert.equal(afterProduct.stock, beforeStock)

    const transactionCount = await InventoryTransaction.countDocuments({
      referenceType: 'INVENTORY_IMPORT',
    })
    assert.equal(transactionCount, 1)
  })

  it('confirms inventory export and decreases stock inside transaction', async () => {
    const response = await request('/api/inventory/export', {
      method: 'POST',
      token: adminToken,
      body: {
        reason: 'MANUAL',
        note: 'Xuat cho dong san pham demo',
        status: 'CONFIRMED',
        items: [
          {
            productId: laptopProduct._id,
            quantity: 3,
          },
        ],
      },
    })

    assert.equal(response.status, 201)
    const payload = await response.json()
    assert.equal(payload.receipt.status, 'CONFIRMED')
    assert.equal(payload.receipt.items[0].stockBefore, 9)
    assert.equal(payload.receipt.items[0].stockAfter, 6)

    const updatedProduct = await Product.findById(laptopProduct._id)
    assert.equal(updatedProduct.stock, 6)
  })

  it('rejects inventory export when stock is insufficient', async () => {
    const beforeStock = (await Product.findById(laptopProduct._id)).stock

    const response = await request('/api/inventory/export', {
      method: 'POST',
      token: adminToken,
      body: {
        reason: 'DAMAGED',
        status: 'CONFIRMED',
        items: [
          {
            productId: laptopProduct._id,
            quantity: 999,
          },
        ],
      },
    })

    assert.equal(response.status, 400)

    const afterProduct = await Product.findById(laptopProduct._id)
    assert.equal(afterProduct.stock, beforeStock)
  })

  it('returns dashboard calculations and activity data', async () => {
    const response = await request('/api/inventory/dashboard', {
      token: adminToken,
    })

    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.totalProducts, 11)
    assert.equal(payload.lowStockProducts >= 1, true)
    assert.equal(payload.outOfStockProducts, 1)
    assert.equal(Array.isArray(payload.recentActivities), true)
    assert.equal(payload.totalInventoryValue > 0, true)
  })

  it('supports transaction pagination filters', async () => {
    const response = await request('/api/inventory/transactions?limit=1&page=1&sort=newest', {
      token: adminToken,
    })

    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.pagination.limit, 1)
    assert.equal(payload.items.length, 1)
    assert.equal(payload.pagination.totalItems >= 2, true)
  })

  it('deducts stock when an order is completed', async () => {
    const result = await recordOrderCompletionInventory(
      {
        id: 'ORDER-20260607-001',
        items: [
        {
          productId: mouseProduct._id,
          quantity: 1,
        },
      ],
      },
      adminUser,
    )

    assert.equal(result.deducted, true)

    const updatedMouse = await Product.findById(mouseProduct._id)
    assert.equal(updatedMouse.stock, 0)
    assert.equal(updatedMouse.sold, 1)

    const orderTransaction = await InventoryTransaction.findOne({
      referenceType: 'ORDER',
      referenceId: 'ORDER-20260607-001',
    }).lean()

    assert.ok(orderTransaction)
    assert.equal(orderTransaction.stockBefore, 1)
    assert.equal(orderTransaction.stockAfter, 0)
  })

  it('deducts stock and increases sold through the public order consume endpoint', async () => {
    const response = await request('/api/orders/consume-stock', {
      method: 'POST',
      token: customerToken,
      body: {
        id: 'ORDER-20260607-002',
        items: [
          {
            productId: thinkPadProduct._id,
            quantity: 2,
          },
        ],
      },
    })

    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.deducted, true)

    const updatedProduct = await Product.findById(thinkPadProduct._id)
    assert.equal(updatedProduct.stock, 6)
    assert.equal(updatedProduct.sold, 2)
  })

  it('rolls back order completion when stock is insufficient', async () => {
    const beforeStock = (await Product.findById(mouseProduct._id)).stock

    await assert.rejects(
      () =>
        recordOrderCompletionInventory(
          {
            id: 'ORDER-20260607-ROLLBACK',
            items: [
              {
                productId: mouseProduct._id,
                quantity: 2,
              },
            ],
          },
          adminUser,
        ),
      /khong du ton kho/i,
    )

    const afterProduct = await Product.findById(mouseProduct._id)
    assert.equal(afterProduct.stock, beforeStock)
  })

  it('exposes AI inventory insights through the AI middleware route', async () => {
    const response = await request('/api/ai/inventory-insights', {
      method: 'POST',
      token: adminToken,
      body: {},
    })

    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(typeof payload.summary, 'string')
    assert.equal(Array.isArray(payload.recommendations), true)
  })

  it('classifies common AI shopping intents into the correct product category', async () => {
    const cases = [
      {
        message: 'tôi muốn mua máy tính chơi game giá dưới 25 triệu',
        expectedCategory: 'Laptop',
      },
      {
        message: 'tôi cần cáp sạc type c nhanh',
        expectedCategory: 'Charging Cable',
      },
      {
        message: 'tôi cần sạc dự phòng dung lượng lớn',
        expectedCategory: 'Power Bank',
      },
    ]

    for (const testCase of cases) {
      const response = await request('/api/ai/chat', {
        method: 'POST',
        token: customerToken,
        body: {
          message: testCase.message,
          context: {
            cartItems: [],
            favoriteItems: [],
            aiPreferences: {},
          },
          conversationContext: {},
          recentMessages: [],
          conversationSummary: '',
        },
      })

      assert.equal(response.status, 200)
      const payload = await response.json()
      assert.equal(payload.intent.category, testCase.expectedCategory)
    }
  })

  it('asks for more detail when the message is too vague to infer a category', async () => {
    const response = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'mình cần cái nào tốt',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: {},
        recentMessages: [],
        conversationSummary: '',
      },
    })

    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.needMoreInfo, true)
    assert.equal(typeof payload.reply, 'string')
    assert.equal(payload.reply.length > 0, true)
    assert.equal(typeof payload.followUpQuestion, 'string')
    assert.equal(payload.followUpQuestion.length > 0, true)
  })

  it('keeps the previous shopping context for follow-up AI questions', async () => {
    const firstResponse = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'tôi muốn mua laptop học lập trình dưới 25 triệu',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: {},
        recentMessages: [],
        conversationSummary: '',
      },
    })

    assert.equal(firstResponse.status, 200)
    const firstPayload = await firstResponse.json()
    assert.equal(firstPayload.intent.category, 'Laptop')
    assert.equal(firstPayload.conversationContext?.category, 'Laptop')

    const secondResponse = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'loại nào là tốt nhất cho chơi game',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: firstPayload.conversationContext,
        recentMessages: [
          {
            role: 'user',
            content: 'tôi muốn mua laptop học lập trình dưới 25 triệu',
          },
          {
            role: 'assistant',
            content: String(firstPayload.reply || ''),
          },
          {
            role: 'user',
            content: 'loại nào là tốt nhất cho chơi game',
          },
        ],
        conversationSummary: 'Người dùng đang tìm laptop học lập trình dưới 25 triệu, sau đó hỏi tiếp loại nào chơi game tốt.',
      },
    })

    assert.equal(secondResponse.status, 200)
    const secondPayload = await secondResponse.json()
    assert.equal(secondPayload.intent.category, 'Laptop')
    assert.equal(secondPayload.conversationContext?.category, 'Laptop')
    assert.equal(Array.isArray(secondPayload.recommendedProducts), true)
    assert.equal(
      secondPayload.recommendedProducts.every((product) => product.category === 'Laptop'),
      true,
    )
  })

  it('tightens the budget when the user asks for something cheaper in the follow-up', async () => {
    const firstResponse = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'tôi muốn mua laptop học lập trình dưới 25 triệu',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: {},
        recentMessages: [],
        conversationSummary: '',
      },
    })

    assert.equal(firstResponse.status, 200)
    const firstPayload = await firstResponse.json()

    const secondResponse = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'rẻ hơn chút',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: firstPayload.conversationContext,
        recentMessages: [
          {
            role: 'user',
            content: 'tôi muốn mua laptop học lập trình dưới 25 triệu',
          },
          {
            role: 'assistant',
            content: String(firstPayload.reply || ''),
          },
          {
            role: 'user',
            content: 'rẻ hơn chút',
          },
        ],
        conversationSummary: 'Người dùng đang tìm laptop học lập trình dưới 25 triệu rồi hỏi rẻ hơn chút.',
      },
    })

    assert.equal(secondResponse.status, 200)
    const secondPayload = await secondResponse.json()
    assert.equal(secondPayload.intent.category, 'Laptop')
    assert.equal(secondPayload.conversationContext?.category, 'Laptop')
    assert.equal(
      Number(secondPayload.conversationContext?.budget?.max || 0) < Number(firstPayload.conversationContext?.budget?.max || 0),
      true,
    )
  })

  it('switches to a new explicit category when the follow-up clearly changes the product group', async () => {
    const firstResponse = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'tôi muốn mua laptop học lập trình dưới 25 triệu',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: {},
        recentMessages: [],
        conversationSummary: '',
      },
    })

    assert.equal(firstResponse.status, 200)
    const firstPayload = await firstResponse.json()

    const secondResponse = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'giờ đổi sang điện thoại pin trâu',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: firstPayload.conversationContext,
        recentMessages: [
          {
            role: 'user',
            content: 'tôi muốn mua laptop học lập trình dưới 25 triệu',
          },
          {
            role: 'assistant',
            content: String(firstPayload.reply || ''),
          },
          {
            role: 'user',
            content: 'giờ đổi sang điện thoại pin trâu',
          },
        ],
        conversationSummary: 'Người dùng chuyển từ laptop sang điện thoại pin trâu.',
      },
    })

    assert.equal(secondResponse.status, 200)
    const secondPayload = await secondResponse.json()
    assert.equal(secondPayload.intent.category, 'Phone')
    assert.equal(secondPayload.conversationContext?.category, 'Phone')
  })

  it('explains the reason when the user asks why a product is recommended', async () => {
    const firstResponse = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'tôi muốn mua laptop học lập trình dưới 25 triệu',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: {},
        recentMessages: [],
        conversationSummary: '',
      },
    })

    assert.equal(firstResponse.status, 200)
    const firstPayload = await firstResponse.json()

    const secondResponse = await request('/api/ai/chat', {
      method: 'POST',
      token: customerToken,
      body: {
        message: 'tại sao lại nghiêng về Acer Aspire 5 i5 16GB 512GB',
        context: {
          cartItems: [],
          favoriteItems: [],
          aiPreferences: {},
        },
        conversationContext: firstPayload.conversationContext,
        recentMessages: [
          {
            role: 'user',
            content: 'tôi muốn mua laptop học lập trình dưới 25 triệu',
          },
          {
            role: 'assistant',
            content: String(firstPayload.reply || ''),
          },
          {
            role: 'user',
            content: 'tại sao lại nghiêng về Acer Aspire 5 i5 16GB 512GB',
          },
        ],
        conversationSummary: 'Người dùng hỏi lý do vì sao nghiêng về Acer Aspire 5.',
      },
    })

    assert.equal(secondResponse.status, 200)
    const secondPayload = await secondResponse.json()
    assert.equal(secondPayload.conversationContext?.category, 'Laptop')
    assert.equal(secondPayload.needMoreInfo, false)
    assert.equal(secondPayload.followUpQuestion, '')
    assert.equal(typeof secondPayload.reply, 'string')
    assert.equal(
      ['vì', 'do', 'lý do', 'ly do'].some((keyword) => secondPayload.reply.toLowerCase().includes(keyword)),
      true,
    )
  })

  it('prioritizes brand-specific product families across major brands', async () => {
    const cases = [
      {
        message: 'tôi muốn xem macbook',
        expectedFamily: /MacBook/i,
        expectedCategory: 'Laptop',
      },
      {
        message: 'tôi muốn xem iphone',
        expectedFamily: /iPhone/i,
        expectedCategory: 'Phone',
      },
      {
        message: 'tôi muốn xem airpods chống ồn',
        expectedFamily: /AirPods/i,
        expectedCategory: 'Headphones',
      },
      {
        message: 'tôi muốn xem thinkpad',
        expectedFamily: /ThinkPad/i,
        expectedCategory: 'Laptop',
      },
      {
        message: 'tôi muốn xem xps',
        expectedFamily: /XPS/i,
        expectedCategory: 'Laptop',
      },
      {
        message: 'tôi muốn xem redmi note',
        expectedFamily: /Redmi/i,
        expectedCategory: 'Phone',
      },
      {
        message: 'tôi muốn xem sony wh chống ồn',
        expectedFamily: /Sony WH/i,
        expectedCategory: 'Headphones',
      },
      {
        message: 'tôi muốn xem logitech g',
        expectedFamily: /Logitech G/i,
        expectedCategory: 'Mouse',
      },
    ]

    for (const testCase of cases) {
      const response = await request('/api/ai/chat', {
        method: 'POST',
        token: customerToken,
        body: {
          message: testCase.message,
          context: {
            cartItems: [],
            favoriteItems: [],
            aiPreferences: {},
          },
          conversationContext: {},
          recentMessages: [],
          conversationSummary: '',
        },
      })

      assert.equal(response.status, 200)
      const payload = await response.json()
      assert.equal(Array.isArray(payload.recommendedProducts), true)
      assert.ok(payload.recommendedProducts.length > 0)
      assert.equal(testCase.expectedFamily.test(payload.recommendedProducts[0].name), true)
      assert.equal(payload.recommendedProducts[0].category, testCase.expectedCategory)
    }
  })
})
