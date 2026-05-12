import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/formatCurrency'

function ProductCard({ product }) {
  const productId = product._id || product.id

  return (
    <article className="product-card">
      <Link to={`/products/${productId}`} className="product-image-link">
        <img src={product.image} alt={product.name} className="product-image" />
      </Link>

      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p className="product-price">{formatCurrency(product.price)}</p>
      </div>

      <div className="product-actions">
        <Link to={`/products/${productId}`} className="button button-outline">
          Xem chi tiết
        </Link>
      </div>
    </article>
  )
}

export default ProductCard
