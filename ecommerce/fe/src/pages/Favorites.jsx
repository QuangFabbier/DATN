import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { FavoritesSkeleton } from '../components/Skeleton'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { useInitialRender } from '../hooks/useInitialRender'
import { useToast } from '../hooks/useToast'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductId, getProductStock } from '../utils/product'

function Favorites() {
  const { addToCart } = useCart()
  const { favoriteItems, removeFavorite } = useFavorites()
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()

  function handleMoveToCart(product) {
    const productId = getProductId(product)
    const added = addToCart(product, 1)

    if (added) {
      removeFavorite(productId)
      showToast({
        type: 'success',
        title: 'Đã chuyển vào giỏ hàng',
        message: `${product.name} đã được chuyển từ yêu thích sang giỏ hàng.`,
      })
      return
    }

    showToast({
      type: 'warning',
      title: 'Không thể chuyển vào giỏ',
      message: 'Sản phẩm đang hết hàng hoặc đã đạt số lượng tối đa trong giỏ.',
    })
  }

  if (!isInitialRenderReady) {
    return (
      <section className="page-section">
        <FavoritesSkeleton items={3} />
      </section>
    )
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Yêu thích</p>
          <h1>Sản phẩm yêu thích</h1>
        </div>
      </div>

      {favoriteItems.length === 0 ? (
        <EmptyState
          title="Chưa có sản phẩm yêu thích"
          description="Lưu lại những món bạn muốn quay lại sau, rồi dùng quick view hoặc compare để chốt nhanh hơn."
          icon="fa-heart"
          action={
            <Link to="/products" className="button">
              Xem sản phẩm
            </Link>
          }
        />
      ) : (
        <div className="cart-list">
          {favoriteItems.map((product) => (
            <article key={getProductId(product)} className="cart-item">
              <img src={product.image} alt={product.name} />
              <div className="cart-item-content">
                <h3>{product.name}</h3>
                <p>{formatCurrency(product.price)}</p>
                {getProductStock(product) !== null ? (
                  <p className="product-stock">
                    {product.stock === 0 ? 'Hết hàng' : `Tồn kho: ${product.stock}`}
                  </p>
                ) : null}
              </div>
              <div className="cart-item-actions">
                <Link to={`/products/${getProductId(product)}`} className="button button-outline">
                  Xem chi tiết
                </Link>
                <button
                  type="button"
                  className="button button-light button-pressable"
                  onClick={() => handleMoveToCart(product)}
                  disabled={product.stock === 0}
                >
                  Chuyển vào giỏ
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    removeFavorite(getProductId(product))
                    showToast({
                      type: 'info',
                      title: 'Đã xóa khỏi yêu thích',
                      message: `${product.name} đã được xóa khỏi danh sách yêu thích.`,
                    })
                  }}
                >
                  Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Favorites
