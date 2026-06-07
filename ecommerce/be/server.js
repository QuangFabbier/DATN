import connectDB from './config/db.js'
import app from './app.js'

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    await connectDB()

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

startServer()
