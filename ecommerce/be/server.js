import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import connectDB from './config/db.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js'
import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import testRoutes from './routes/testRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

connectDB()

const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
}

app.use(cors(corsOptions))
app.use(express.json())

app.use('/api/test', testRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
