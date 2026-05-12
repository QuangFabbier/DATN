import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import testRoutes from './routes/testRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Kết nối MongoDB, dùng MONGO_URI trong file .env.
connectDB()

app.use(cors())
app.use(express.json())

app.use('/api/test', testRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
