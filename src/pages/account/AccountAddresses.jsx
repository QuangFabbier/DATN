import { useState } from 'react'
import AddressCard from '../../components/account/AddressCard'
import SettingsSection from '../../components/account/SettingsSection'
import EmptyState from '../../components/EmptyState'
import { Skeleton } from '../../components/Skeleton'
import { ButtonSpinner } from '../../components/Spinner'
import { useInitialRender } from '../../hooks/useInitialRender'
import { useToast } from '../../hooks/useToast'
import { getAddresses, saveAddresses } from '../../services/accountStorage'
import { wait } from '../../utils/timing'

const vietnamesePhoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/

const initialAddressFormData = {
  id: '',
  fullName: '',
  phone: '',
  city: '',
  district: '',
  ward: '',
  detail: '',
}

function AccountAddresses() {
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()
  const [addresses, setAddresses] = useState(getAddresses)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [addressFormData, setAddressFormData] = useState(initialAddressFormData)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  function openCreateAddressModal() {
    setAddressFormData(initialAddressFormData)
    setFormErrors({})
    setIsAddressModalOpen(true)
  }

  function openEditAddressModal(address) {
    setAddressFormData({
      id: address.id,
      fullName: address.fullName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      ward: address.ward,
      detail: address.detail,
    })
    setFormErrors({})
    setIsAddressModalOpen(true)
  }

  function handleAddressFormChange(event) {
    const { name, value } = event.target

    setAddressFormData((currentAddressFormData) => ({
      ...currentAddressFormData,
      [name]: value,
    }))

    setFormErrors((currentFormErrors) => ({
      ...currentFormErrors,
      [name]: '',
    }))
  }

  function validateAddressForm() {
    const nextErrors = {}

    if (!addressFormData.fullName.trim()) {
      nextErrors.fullName = 'Vui lòng nhập họ tên người nhận.'
    }

    if (!addressFormData.phone.trim()) {
      nextErrors.phone = 'Vui lòng nhập số điện thoại.'
    } else if (!vietnamesePhoneRegex.test(addressFormData.phone.trim())) {
      nextErrors.phone = 'Số điện thoại chưa đúng định dạng Việt Nam.'
    }

    if (!addressFormData.city.trim()) {
      nextErrors.city = 'Vui lòng nhập tỉnh/thành phố.'
    }

    if (!addressFormData.district.trim()) {
      nextErrors.district = 'Vui lòng nhập quận/huyện.'
    }

    if (!addressFormData.ward.trim()) {
      nextErrors.ward = 'Vui lòng nhập phường/xã.'
    }

    if (!addressFormData.detail.trim()) {
      nextErrors.detail = 'Vui lòng nhập địa chỉ chi tiết.'
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSaveAddress(event) {
    event.preventDefault()

    if (!validateAddressForm() || isSaving) {
      showToast({
        type: 'warning',
        title: 'Địa chỉ chưa hợp lệ',
        message: 'Vui lòng kiểm tra lại các trường bắt buộc trước khi lưu.',
      })
      return
    }

    setIsSaving(true)
    await wait(500)

    const isUpdatingAddress = Boolean(addressFormData.id)
    const nextAddresses = isUpdatingAddress
      ? addresses.map((address) =>
          address.id === addressFormData.id
            ? {
                ...address,
                ...addressFormData,
                updatedAt: new Date().toISOString(),
              }
            : address,
        )
      : [
          {
            ...addressFormData,
            id: '',
            isDefault: addresses.length === 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...addresses,
        ]

    const persistedAddresses = saveAddresses(nextAddresses)

    setAddresses(persistedAddresses)
    setIsSaving(false)
    setIsAddressModalOpen(false)

    showToast({
      type: 'success',
      title: isUpdatingAddress ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới',
      message: 'Danh sách địa chỉ giao hàng đã được lưu thành công.',
    })
  }

  function handleDeleteAddress(addressId) {
    const nextAddresses = addresses.filter((address) => address.id !== addressId)
    const persistedAddresses = saveAddresses(nextAddresses)
    setAddresses(persistedAddresses)

    showToast({
      type: 'info',
      title: 'Đã xóa địa chỉ',
      message: 'Địa chỉ giao hàng đã được xóa khỏi danh sách.',
    })
  }

  function handleSetDefaultAddress(addressId) {
    const nextAddresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === addressId,
      updatedAt: new Date().toISOString(),
    }))

    const persistedAddresses = saveAddresses(nextAddresses)
    setAddresses(persistedAddresses)

    showToast({
      type: 'success',
      title: 'Đã cập nhật địa chỉ mặc định',
      message: 'Địa chỉ mới sẽ được ưu tiên ở bước checkout.',
    })
  }

  if (!isInitialRenderReady) {
    return (
      <div className="account-settings-section">
        <Skeleton style={{ width: '42%', height: 22 }} />
        <Skeleton style={{ width: '100%', height: 240, borderRadius: 20 }} />
      </div>
    )
  }

  return (
    <SettingsSection
      eyebrow="Địa chỉ"
      title="Địa chỉ giao hàng"
      description="Lưu nhiều địa chỉ để checkout nhanh hơn và chọn mặc định theo thói quen mua sắm của bạn."
      actions={
        <button type="button" className="button" onClick={openCreateAddressModal}>
          <i className="fa-solid fa-plus" aria-hidden="true" />
          <span>Thêm địa chỉ</span>
        </button>
      }
    >
      {addresses.length === 0 ? (
        <EmptyState
          title="Bạn chưa có địa chỉ giao hàng"
          description="Tạo địa chỉ đầu tiên để checkout nhanh và giảm thao tác nhập form cho các đơn sau."
          icon="fa-location-dot"
          action={
            <button type="button" className="button" onClick={openCreateAddressModal}>
              Tạo địa chỉ mới
            </button>
          }
        />
      ) : (
        <div className="account-address-grid">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={openEditAddressModal}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefaultAddress}
            />
          ))}
        </div>
      )}

      {isAddressModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsAddressModalOpen(false)}>
          <form className="modal-card" onSubmit={handleSaveAddress} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Địa chỉ giao hàng</p>
                <h2>{addressFormData.id ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsAddressModalOpen(false)}
                aria-label="Đóng modal địa chỉ"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="account-grid">
              <label className="account-input-field">
                <span>Họ tên</span>
                <input
                  type="text"
                  name="fullName"
                  value={addressFormData.fullName}
                  onChange={handleAddressFormChange}
                  placeholder="Nguyễn Văn A"
                />
                {formErrors.fullName ? <small className="field-error">{formErrors.fullName}</small> : null}
              </label>

              <label className="account-input-field">
                <span>Số điện thoại</span>
                <input
                  type="tel"
                  name="phone"
                  value={addressFormData.phone}
                  onChange={handleAddressFormChange}
                  placeholder="098xxxxxxx"
                />
                {formErrors.phone ? <small className="field-error">{formErrors.phone}</small> : null}
              </label>

              <label className="account-input-field">
                <span>Tỉnh / Thành phố</span>
                <input
                  type="text"
                  name="city"
                  value={addressFormData.city}
                  onChange={handleAddressFormChange}
                  placeholder="Hà Nội"
                />
                {formErrors.city ? <small className="field-error">{formErrors.city}</small> : null}
              </label>

              <label className="account-input-field">
                <span>Quận / Huyện</span>
                <input
                  type="text"
                  name="district"
                  value={addressFormData.district}
                  onChange={handleAddressFormChange}
                  placeholder="Cầu Giấy"
                />
                {formErrors.district ? <small className="field-error">{formErrors.district}</small> : null}
              </label>

              <label className="account-input-field">
                <span>Phường / Xã</span>
                <input
                  type="text"
                  name="ward"
                  value={addressFormData.ward}
                  onChange={handleAddressFormChange}
                  placeholder="Nghĩa Đô"
                />
                {formErrors.ward ? <small className="field-error">{formErrors.ward}</small> : null}
              </label>

              <label className="account-input-field account-full-width">
                <span>Địa chỉ chi tiết</span>
                <textarea
                  name="detail"
                  value={addressFormData.detail}
                  onChange={handleAddressFormChange}
                  placeholder="Số nhà, tên đường, tòa nhà..."
                />
                {formErrors.detail ? <small className="field-error">{formErrors.detail}</small> : null}
              </label>
            </div>

            <div className="quick-view-actions">
              <button type="button" className="button button-light" onClick={() => setIsAddressModalOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="button" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <ButtonSpinner size="sm" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
                    <span>Lưu địa chỉ</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </SettingsSection>
  )
}

export default AccountAddresses
