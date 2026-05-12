import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductStock } from '../utils/product'

function Favorites() {
  const { addToCart } = useCart()
  const { favoriteItems, removeFavorite } = useFavorites()

  function handleMoveToCart(product) {
    const added = addToCart(product, 1)

    if (added) {
      removeFavorite(product.id)
    }
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
        <div className="empty-state">
          <p>Chưa có sản phẩm yêu thích.</p>
          <Link to="/products" className="button">
            Xem sản phẩm
          </Link>
        </div>
      ) : (
        <div className="cart-list">
          {favoriteItems.map((product) => (
            <article key={product.id} className="cart-item">
              <img src={product.image} alt={product.name} />
              <div className="cart-item-content">
                <h3>{product.name}</h3>
                <p>{formatCurrency(product.price)}</p>
                {getProductStock(product) !== null && (
                  <p className="product-stock">
                    {product.stock === 0 ? 'Hết hàng' : `Tồn kho: ${product.stock}`}
                  </p>
                )}
              </div>
              <div className="cart-item-actions">
                <Link to={`/products/${product.id}`} className="button button-outline">
                  Xem chi tiết
                </Link>
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => handleMoveToCart(product)}
                  disabled={product.stock === 0}
                >
                  Chuyển vào giỏ
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => removeFavorite(product.id)}
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
