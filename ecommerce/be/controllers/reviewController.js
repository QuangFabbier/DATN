import asyncHandler from '../utils/asyncHandler.js'
import {
  createProductReview,
  deleteProductReview,
  getAdminReviewList,
  getProductReviews,
  updateProductReview,
} from '../services/productReviewService.js'

const listProductReviews = asyncHandler(async (req, res) => {
  const result = await getProductReviews(req.params.productId, {
    page: req.query.page,
    limit: req.query.limit,
    currentUser: req.user || null,
  })

  res.status(200).json({
    message: 'Lấy danh sách đánh giá thành công.',
    ...result,
  })
})

const createReview = asyncHandler(async (req, res) => {
  const result = await createProductReview(req.params.productId, req.body, req.user)

  res.status(201).json({
    message: 'Gửi đánh giá thành công.',
    ...result,
  })
})

const updateReview = asyncHandler(async (req, res) => {
  const result = await updateProductReview(req.params.id, req.body, req.user)

  res.status(200).json({
    message: 'Cập nhật đánh giá thành công.',
    ...result,
  })
})

const deleteReview = asyncHandler(async (req, res) => {
  const result = await deleteProductReview(req.params.id, req.user)

  res.status(200).json({
    message: 'Xóa đánh giá thành công.',
    ...result,
  })
})

const getAdminReviews = asyncHandler(async (req, res) => {
  const result = await getAdminReviewList({
    page: req.query.page,
    limit: req.query.limit,
    rating: req.query.rating,
    productId: req.query.productId,
    search: req.query.search,
    currentUser: req.user,
  })

  res.status(200).json({
    message: 'Lấy danh sách review quản trị thành công.',
    ...result,
  })
})

export { createReview, deleteReview, getAdminReviews, listProductReviews, updateReview }
