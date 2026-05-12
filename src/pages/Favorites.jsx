import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useFavorites } from '../hooks/useFavorites'

function Favorites() {
  const { favoriteItems } = useFavorites()

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
        <div className="product-grid">
          {favoriteItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

export default Favorites
