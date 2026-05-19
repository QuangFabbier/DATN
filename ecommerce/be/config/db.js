import mongoose from 'mongoose'

async function connectDB() {
  const mongoUri = process.env.MONGO_URI

  if (!mongoUri) {
    throw new Error('MongoDB Error: MONGO_URI is not configured')
  }

  const connection = await mongoose.connect(mongoUri)
  console.log(`MongoDB Connected: ${connection.connection.host}`)
  return connection
}

export default connectDB
