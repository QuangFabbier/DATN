function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`)
  res.status(404)
  next(error)
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500)

  res.status(statusCode).json({
    message: error.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  })
}

export { notFound, errorHandler }
