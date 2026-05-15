import { useCompare } from '../hooks/useCompare'
import { formatCurrency } from '../utils/formatCurrency'

function CompareTray() {
  const {
    clearCompare,
    compareItems,
    isCompareOpen,
    removeCompare,
    setIsCompareOpen,
  } = useCompare()

  if (!compareItems.length) {
    return null
  }

  return (
    <>
      <div className="compare-tray">
        <div className="compare-tray-copy">
          <p className="eyebrow">So sánh nhanh</p>
          <strong>{compareItems.length}/3 sản phẩm đang chờ</strong>
        </div>

        <div className="compare-tray-items">
          {compareItems.map((item) => (
            <article key={item.id} className="compare-tray-item">
              <img src={item.image} alt={item.name} />
              <div>
                <p>{item.name}</p>
                <span>{formatCurrency(item.price)}</span>
              </div>
              <button
                type="button"
                className="icon-button subtle"
                onClick={() => removeCompare(item.id)}
                aria-label={`Bỏ ${item.name} khỏi danh sách so sánh`}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>

        <div className="compare-tray-actions">
          <button type="button" className="button button-light" onClick={clearCompare}>
            Xóa hết
          </button>
          <button type="button" className="button" onClick={() => setIsCompareOpen(true)}>
            So sánh ngay
          </button>
        </div>
      </div>

      {isCompareOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCompareOpen(false)}>
          <section
            className="modal-card compare-modal"
            onClick={(event) => event.stopPropagation()}
            aria-label="So sánh sản phẩm"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Compare</p>
                <h2>Bảng so sánh sản phẩm</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsCompareOpen(false)}
                aria-label="Đóng bảng so sánh"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="compare-table-wrapper">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Tiêu chí</th>
                    {compareItems.map((item) => (
                      <th key={item.id}>
                        <div className="compare-product-head">
                          <img src={item.image} alt={item.name} />
                          <strong>{item.name}</strong>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Giá</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-price`}>{formatCurrency(item.price)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Danh mục</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-category`}>{item.category}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Tồn kho</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-stock`}>{item.stock ?? 'Đang cập nhật'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Mô tả</td>
                    {compareItems.map((item) => (
                      <td key={`${item.id}-description`}>{item.description || 'Chưa có mô tả.'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

export default CompareTray
