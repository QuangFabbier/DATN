function Skeleton({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />
}

function ProductCardSkeleton() {
  return (
    <article className="product-card">
      <div className="product-image-link">
        <Skeleton className="skeleton-image" style={{ aspectRatio: '4 / 3' }} />
        <Skeleton className="skeleton-chip" style={{ position: 'absolute', top: 14, left: 14, width: 92 }} />
        <Skeleton
          className="skeleton-chip"
          style={{ position: 'absolute', top: 14, right: 14, width: 64, height: 30 }}
        />
      </div>

      <div className="product-card-body">
        <Skeleton className="skeleton-chip" style={{ width: 108, marginBottom: 12 }} />
        <Skeleton style={{ width: '100%', height: 28, marginBottom: 8 }} />
        <Skeleton style={{ width: '88%', height: 28, marginBottom: 14 }} />
        <Skeleton style={{ width: 148, height: 26, marginBottom: 6 }} />
        <Skeleton style={{ width: 110, height: 20 }} />
      </div>

      <div className="product-actions">
        <Skeleton style={{ flex: 1, height: 46, borderRadius: 14 }} />
        <Skeleton style={{ width: 96, height: 36, borderRadius: 999 }} />
      </div>
    </article>
  )
}

function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="hero-section hero-skeleton">
      <div className="hero-overlay">
        <div className="hero-content">
          <Skeleton className="skeleton-chip" style={{ width: 132, marginBottom: 18 }} />
          <Skeleton style={{ width: '75%', height: 56, marginBottom: 14 }} />
          <Skeleton style={{ width: '90%', height: 24, marginBottom: 10 }} />
          <Skeleton style={{ width: '80%', height: 24, marginBottom: 24 }} />
          <div className="hero-actions">
            <Skeleton style={{ width: 152, height: 48, borderRadius: 14 }} />
            <Skeleton style={{ width: 146, height: 48, borderRadius: 14 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="product-detail">
      <div className="product-gallery">
        <div className="detail-image-box">
          <Skeleton className="skeleton-image" style={{ minHeight: '520px' }} />
        </div>
        <div className="gallery-thumbnails">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} style={{ width: 92, height: 92, borderRadius: 18 }} />
          ))}
        </div>
      </div>

      <div className="detail-content">
        <Skeleton className="skeleton-chip" style={{ width: 120 }} />
        <Skeleton style={{ width: '100%', height: 54 }} />
        <Skeleton style={{ width: '75%', height: 32 }} />
        <Skeleton style={{ width: '92%', height: 22 }} />
        <Skeleton style={{ width: '88%', height: 22 }} />
        <Skeleton style={{ width: '84%', height: 22 }} />
        <Skeleton style={{ width: 180, height: 42, borderRadius: 999 }} />
        <div className="detail-actions">
          <Skeleton style={{ width: 150, height: 48, borderRadius: 14 }} />
          <Skeleton style={{ width: 176, height: 48, borderRadius: 14 }} />
          <Skeleton style={{ width: 140, height: 48, borderRadius: 14 }} />
        </div>
      </div>
    </div>
  )
}

function ListItemSkeleton() {
  return (
    <article className="cart-item">
      <Skeleton style={{ width: '100%', height: 112, borderRadius: 18 }} />
      <div className="cart-item-content">
        <Skeleton style={{ width: '72%', height: 28 }} />
        <Skeleton style={{ width: 132, height: 22 }} />
        <Skeleton style={{ width: '44%', height: 18 }} />
        <Skeleton style={{ width: 146, height: 42, borderRadius: 999 }} />
      </div>
      <div className="cart-item-actions">
        <Skeleton style={{ width: 92, height: 20 }} />
      </div>
    </article>
  )
}

function CartSkeleton({ items = 3 }) {
  return (
    <div className="cart-layout">
      <div className="cart-list">
        {Array.from({ length: items }).map((_, index) => (
          <ListItemSkeleton key={index} />
        ))}
      </div>

      <aside className="order-summary">
        <Skeleton style={{ width: 160, height: 34, marginBottom: 16 }} />
        <div className="summary-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="summary-skeleton-row">
              <Skeleton style={{ width: '60%', height: 18 }} />
              <Skeleton style={{ width: 92, height: 18 }} />
            </div>
          ))}
        </div>
        <Skeleton style={{ width: '100%', height: 1, margin: '12px 0 20px' }} />
        <Skeleton style={{ width: '65%', height: 28, marginBottom: 20 }} />
        <Skeleton style={{ width: '100%', height: 48, borderRadius: 14 }} />
      </aside>
    </div>
  )
}

function FavoritesSkeleton({ items = 3 }) {
  return (
    <div className="cart-list">
      {Array.from({ length: items }).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </div>
  )
}

function OrderFormSkeleton() {
  return (
    <div className="form-layout">
      <div className="form-card">
        <Skeleton style={{ width: 142, height: 34, marginBottom: 8 }} />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <Skeleton style={{ width: 110, height: 18, marginBottom: 8 }} />
            <Skeleton style={{ width: '100%', height: index > 1 ? 104 : 48, borderRadius: 14 }} />
          </div>
        ))}
        <Skeleton style={{ width: 188, height: 48, borderRadius: 14 }} />
      </div>

      <aside className="order-summary">
        <Skeleton style={{ width: 188, height: 34, marginBottom: 18 }} />
        <div className="summary-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="summary-skeleton-row">
              <Skeleton style={{ width: '58%', height: 18 }} />
              <Skeleton style={{ width: 98, height: 18 }} />
            </div>
          ))}
        </div>
        <Skeleton style={{ width: '100%', height: 1, margin: '12px 0 20px' }} />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="summary-skeleton-row">
            <Skeleton style={{ width: '44%', height: 18 }} />
            <Skeleton style={{ width: 92, height: 18 }} />
          </div>
        ))}
      </aside>
    </div>
  )
}

function AdminDashboardSkeleton({ count = 4 }) {
  return (
    <div className="admin-stats-grid">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="admin-stat-card">
          <Skeleton style={{ width: '55%', height: 18 }} />
          <Skeleton style={{ width: '38%', height: 44 }} />
        </article>
      ))}
    </div>
  )
}

function AdminProductsSkeleton() {
  return (
    <>
      <div className="admin-toolbar">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} style={{ width: '100%', height: 48, borderRadius: 14 }} />
        ))}
      </div>

      <div className="admin-table-card">
        <Skeleton style={{ width: 160, height: 18 }} />
        <div className="admin-table-skeleton">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="admin-table-skeleton-row">
              {Array.from({ length: 7 }).map((_, cellIndex) => (
                <Skeleton
                  key={cellIndex}
                  style={{
                    width: '100%',
                    height: cellIndex === 0 ? 58 : 18,
                    borderRadius: cellIndex === 0 ? 14 : 8,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function AdminOrdersSkeleton() {
  return (
    <>
      <div className="admin-toolbar admin-orders-toolbar">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} style={{ width: '100%', height: 48, borderRadius: 14 }} />
        ))}
      </div>

      <div className="admin-table-card">
        <Skeleton style={{ width: 180, height: 18 }} />
        <div className="admin-table-skeleton">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="admin-table-skeleton-row">
              {Array.from({ length: 8 }).map((_, cellIndex) => (
                <Skeleton
                  key={cellIndex}
                  style={{
                    width: '100%',
                    height: 18,
                    borderRadius: 8,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export {
  AdminDashboardSkeleton,
  AdminOrdersSkeleton,
  AdminProductsSkeleton,
  CartSkeleton,
  DetailSkeleton,
  FavoritesSkeleton,
  HeroSkeleton,
  OrderFormSkeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  Skeleton,
}
