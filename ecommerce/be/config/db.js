import mongoose from 'mongoose'

async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI

    if (!mongoUri) {
      console.error('MongoDB Error: MONGO_URI is not configured')
      return null
    }

    const connection = await mongoose.connect(mongoUri)
    console.log(`MongoDB Connected: ${connection.connection.host}`)
    return connection
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`)
    return null
  }
}

export default connectDB
