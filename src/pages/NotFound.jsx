import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'

function NotFound() {
  return (
    <section className="page-section">
      <EmptyState
        title="Trang bạn tìm kiếm không tồn tại"
        description="Đường dẫn này hiện không có trong storefront demo Nexora. Hãy quay lại trang chủ hoặc danh sách sản phẩm."
        icon="fa-compass"
        action={
          <Link to="/" className="button">
            Về trang chủ
          </Link>
        }
      />
    </section>
  )
}

export default NotFound
