import { Link } from 'react-router-dom'
import { useState } from 'react'
import QuickViewModal from '../../components/QuickViewModal'
import SettingsSection from '../../components/account/SettingsSection'
import EmptyState from '../../components/EmptyState'
import { Skeleton } from '../../components/Skeleton'
import { useCart } from '../../hooks/useCart'
import { useCompare } from '../../hooks/useCompare'
import { useFavorites } from '../../hooks/useFavorites'
import { useInitialRender } from '../../hooks/useInitialRender'
import { useToast } from '../../hooks/useToast'
import { formatCurrency } from '../../utils/formatCurrency'
import { getProductId, getProductStock } from '../../utils/product'

function AccountWishlist() {
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()
  const { favoriteItems, removeFavorite } = useFavorites()
  const { addToCart } = useCart()
  const { isCompared, toggleCompare } = useCompare()
  const [quickViewProduct, setQuickViewProduct] = useState(null)

  function handleAddToCart(product) {
    const added = addToCart(product, 1)

    showToast({
      type: added ? 'success' : 'warning',
      title: added ? 'Đã thêm vào giỏ hàng' : 'Chưa thể thêm sản phẩm',
      message: added
        ? `${product.name} đã được thêm vào giỏ hàng.`
        : 'Sản phẩm đang hết hàng hoặc đã đạt số lượng tối đa trong giỏ.',
    })
  }

  function handleCompareToggle(product) {
    const result = toggleCompare(product)

    showToast({
      type: result.status === 'limit' ? 'warning' : 'info',
      title:
        result.status === 'added'
          ? 'Đã thêm để so sánh'
          : result.status === 'removed'
            ? 'Đã bỏ khỏi so sánh'
            : 'Không thể thêm sản phẩm',
      message:
        result.status === 'limit'
          ? 'Bạn chỉ có thể so sánh tối đa 3 sản phẩm cùng lúc.'
          : `${product.name} ${result.status === 'added' ? 'đã sẵn sàng để so sánh.' : 'không còn trong danh sách so sánh.'}`,
    })
  }

  if (!isInitialRenderReady) {
    return (
      <div className="account-settings-section">
        <Skeleton style={{ width: '42%', height: 22 }} />
        <Skeleton style={{ width: '100%', height: 260, borderRadius: 20 }} />
      </div>
    )
  }

  return (
    <SettingsSection
      eyebrow="Wishlist"
      title="Sản phẩm yêu thích"
      description="Danh sách sản phẩm bạn lưu lại để mua sau, so sánh hoặc mở nhanh bằng quick view."
    >
      {favoriteItems.length === 0 ? (
        <EmptyState
          title="Wishlist đang trống"
          description="Hãy thêm sản phẩm từ storefront vào yêu thích để quay lại quyết định nhanh hơn."
          icon="fa-heart"
          action={
            <Link to="/products" className="button">
              Khám phá sản phẩm
            </Link>
          }
        />
      ) : (
        <div className="account-wishlist-grid">
          {favoriteItems.map((product) => {
            const productId = getProductId(product)
            const stock = getProductStock(product)
            const isOutOfStock = stock === 0
            const isProductCompared = isCompared(productId)

            return (
              <article key={productId} className="account-wishlist-card">
                <img src={product.image} alt={product.name} className="account-wishlist-image" />
                <div>
                  <h3>{product.name}</h3>
                  <p className="product-price">{formatCurrency(product.price)}</p>
                </div>
                <div className="account-wishlist-meta">
                  <span>{product.category}</span>
                  <span>{stock === null ? 'Tồn kho cập nhật' : stock === 0 ? 'Hết hàng' : `Kho: ${stock}`}</span>
                </div>

                <div className="account-wishlist-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={isOutOfStock}
                  >
                    {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
                  </button>

                  <button
                    type="button"
                    className="button button-light"
                    onClick={() => setQuickViewProduct(product)}
                  >
                    Xem nhanh
                  </button>

                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => handleCompareToggle(product)}
                  >
                    {isProductCompared ? 'Bỏ so sánh' : 'So sánh'}
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      removeFavorite(getProductId(product))
                      showToast({
                        type: 'info',
                        title: 'Đã xóa khỏi wishlist',
                        message: `${product.name} đã được xóa khỏi sản phẩm yêu thích.`,
                      })
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {quickViewProduct ? (
        <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
      ) : null}
    </SettingsSection>
  )
}

export default AccountWishlist
