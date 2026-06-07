import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'
import aiRoutes from './routes/aiRoutes.js'
import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import paymentSettingRoutes from './routes/paymentSettingRoutes.js'
import productRoutes from './routes/productRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import testRoutes from './routes/testRoutes.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js'

dotenv.config()

const app = express()

const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '5mb' }))

app.use('/api/test', testRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/payment-settings', paymentSettingRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/ai', aiRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
