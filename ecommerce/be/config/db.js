import mongoose from 'mongoose'

async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI chưa được cấu hình. Hãy tạo file .env từ .env.example.')
      return
    }

    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected successfully')
  } catch (error) {
    // Tạm thời chỉ log lỗi để server test vẫn có thể chạy khi chưa cấu hình MongoDB.
    console.error('MongoDB connection failed:', error.message)
  }
}

export default connectDB
