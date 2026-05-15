function AddressCard({ address, onDelete, onEdit, onSetDefault }) {
  return (
    <article className="account-address-card">
      <header>
        <div>
          <h3>{address.fullName}</h3>
          <p>{address.phone}</p>
        </div>
        {address.isDefault ? <span className="account-default-badge">Mặc định</span> : null}
      </header>

      <div className="account-address-content">
        <p>{address.detail}</p>
        <p>
          {address.ward}, {address.district}, {address.city}
        </p>
      </div>

      <footer>
        {!address.isDefault ? (
          <button type="button" className="button button-light" onClick={() => onSetDefault(address.id)}>
            Đặt mặc định
          </button>
        ) : null}
        <button type="button" className="button button-outline" onClick={() => onEdit(address)}>
          Chỉnh sửa
        </button>
        <button type="button" className="text-button" onClick={() => onDelete(address.id)}>
          Xóa
        </button>
      </footer>
    </article>
  )
}

export default AddressCard
