import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Product from './models/Product.js'

dotenv.config()

const sampleProducts = [
  {
    name: 'Laptop Dell Inspiron 15',
    category: 'Laptop',
    price: 15990000,
    image: 'https://placehold.co/600x400/e8f1ff/1f3a5f?text=Dell+Inspiron+15',
    description: 'Laptop học tập và văn phòng với màn hình 15.6 inch, hiệu năng ổn định.',
    stock: 12,
  },
  {
    name: 'Laptop Asus Vivobook 14',
    category: 'Laptop',
    price: 13990000,
    image: 'https://placehold.co/600x400/eaf7ea/245c32?text=Asus+Vivobook+14',
    description: 'Laptop mỏng nhẹ, phù hợp sinh viên, làm báo cáo và học online.',
    stock: 10,
  },
  {
    name: 'iPhone 15 128GB',
    category: 'Điện thoại',
    price: 19990000,
    image: 'https://placehold.co/600x400/f5f5f5/222222?text=iPhone+15',
    description: 'Điện thoại thông minh thiết kế hiện đại, camera tốt và hiệu năng mạnh.',
    stock: 8,
  },
  {
    name: 'Samsung Galaxy A55 5G',
    category: 'Điện thoại',
    price: 9490000,
    image: 'https://placehold.co/600x400/eaf6ff/0f4c81?text=Galaxy+A55',
    description: 'Điện thoại Android màn hình đẹp, pin tốt, hỗ trợ kết nối 5G.',
    stock: 14,
  },
  {
    name: 'Tai nghe Sony WH-CH520',
    category: 'Tai nghe',
    price: 1190000,
    image: 'https://placehold.co/600x400/fff4e6/8a4b00?text=Sony+WH-CH520',
    description: 'Tai nghe Bluetooth nhẹ, pin lâu, phù hợp nghe nhạc và học online.',
    stock: 25,
  },
  {
    name: 'Tai nghe AirPods 3',
    category: 'Tai nghe',
    price: 3990000,
    image: 'https://placehold.co/600x400/f7f0ea/6c3f1d?text=AirPods+3',
    description: 'Tai nghe không dây nhỏ gọn, âm thanh rõ, kết nối nhanh với thiết bị Apple.',
    stock: 16,
  },
  {
    name: 'Bàn phím cơ Keychron K2',
    category: 'Bàn phím',
    price: 2190000,
    image: 'https://placehold.co/600x400/f0ecff/3f2b73?text=Keychron+K2',
    description: 'Bàn phím cơ không dây layout gọn, phù hợp lập trình và làm việc.',
    stock: 15,
  },
  {
    name: 'Bàn phím Logitech K380',
    category: 'Bàn phím',
    price: 790000,
    image: 'https://placehold.co/600x400/fff0f0/8a1f1f?text=Logitech+K380',
    description: 'Bàn phím Bluetooth nhỏ gọn, hỗ trợ nhiều thiết bị, dễ mang theo.',
    stock: 22,
  },
]

async function seedProducts() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI chưa được cấu hình trong file .env')
    }

    // Kết nối MongoDB trước khi thêm dữ liệu mẫu.
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected')

    const products = await Product.insertMany(sampleProducts)
    console.log(`Inserted ${products.length} products`)
  } catch (error) {
    console.error('Seed products failed:', error.message)
  } finally {
    await mongoose.disconnect()
    console.log('MongoDB disconnected')
  }
}

seedProducts()
