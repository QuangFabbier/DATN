import { useEffect, useRef, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { ButtonSpinner } from '../../components/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { getPaymentSettings, updatePaymentSettings } from '../../services/paymentSettingService'
import { withMinimumDelay } from '../../utils/timing'

const initialFormData = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  transferNote: '',
  qrImage: '',
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'N/A'
  }

  return new Date(dateValue).toLocaleString('vi-VN')
}

function AdminPaymentSettings() {
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const imageInputRef = useRef(null)
  const [formData, setFormData] = useState(initialFormData)
  const [currentSettings, setCurrentSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isReadingImage, setIsReadingImage] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [removeExistingQrImage, setRemoveExistingQrImage] = useState(false)

  const canManagePayment = Boolean(user?.canManageAdmins)

  useEffect(() => {
    async function fetchPaymentSettings() {
      if (!canManagePayment) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        const paymentSettings = await withMinimumDelay(getPaymentSettings(), 220)
        setCurrentSettings(paymentSettings)
        setFormData({
          bankName: paymentSettings.bankName || '',
          accountName: paymentSettings.accountName || '',
          accountNumber: paymentSettings.accountNumber || '',
          transferNote: paymentSettings.transferNote || '',
          qrImage: '',
        })
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải cấu hình thanh toán.')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentSettings()
  }, [canManagePayment])

  function handleFormChange(event) {
    const { name, value } = event.target
    setFormData((currentData) => ({ ...currentData, [name]: value }))
    setError('')
  }

  function handleOpenImagePicker() {
    imageInputRef.current?.click()
  }

  function processImageFile(selectedFile) {
    const fileReader = new FileReader()
    setIsReadingImage(true)
    setError('')

    fileReader.onload = () => {
      const imageDataUrl = String(fileReader.result || '')
      setFormData((currentData) => ({ ...currentData, qrImage: imageDataUrl }))
      setRemoveExistingQrImage(false)
      setIsReadingImage(false)
    }

    fileReader.onerror = () => {
      setError('Không thể đọc file ảnh QR. Vui lòng thử lại.')
      setIsReadingImage(false)
    }

    fileReader.readAsDataURL(selectedFile)
  }

  function handleImageFileChange(event) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setError('Chỉ hỗ trợ upload file ảnh QR (jpg, png, webp, gif, ...).')
      return
    }

    const maxImageSizeInBytes = 3 * 1024 * 1024
    if (selectedFile.size > maxImageSizeInBytes) {
      setError('Ảnh QR quá lớn. Vui lòng chọn ảnh tối đa 3MB.')
      return
    }

    processImageFile(selectedFile)
    event.target.value = ''
  }

  function handleImageDrop(event) {
    event.preventDefault()
    setIsDraggingImage(false)

    if (isReadingImage) {
      return
    }

    const selectedFile = event.dataTransfer?.files?.[0]
    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setError('Chỉ hỗ trợ kéo-thả file ảnh QR.')
      return
    }

    const maxImageSizeInBytes = 3 * 1024 * 1024
    if (selectedFile.size > maxImageSizeInBytes) {
      setError('Ảnh QR quá lớn. Vui lòng chọn ảnh tối đa 3MB.')
      return
    }

    processImageFile(selectedFile)
  }

  function handleImageDragOver(event) {
    event.preventDefault()
    if (!isDraggingImage) {
      setIsDraggingImage(true)
    }
  }

  function handleImageDragLeave() {
    setIsDraggingImage(false)
  }

  function handleClearQrImage() {
    setFormData((currentData) => ({ ...currentData, qrImage: '' }))
    setRemoveExistingQrImage(true)
    setCurrentSettings((currentState) => ({
      ...(currentState || {}),
      hasQrImage: false,
      qrImageUrl: '',
    }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const payload = {
        bankName: formData.bankName.trim(),
        accountName: formData.accountName.trim(),
        accountNumber: formData.accountNumber.trim(),
        transferNote: formData.transferNote.trim(),
      }

      if (formData.qrImage) {
        payload.qrImage = formData.qrImage
      } else if (removeExistingQrImage) {
        payload.removeQrImage = true
      }

      const updatedSettings = await updatePaymentSettings(token, payload)
      setCurrentSettings(updatedSettings)
      setFormData((currentData) => ({ ...currentData, qrImage: '' }))
      setRemoveExistingQrImage(false)

      showToast({
        type: 'success',
        title: 'Đã cập nhật thanh toán QR',
        message: 'Thông tin tài khoản và mã QR đã được cập nhật thành công.',
      })
    } catch (requestError) {
      const message = requestError.message || 'Không thể cập nhật cấu hình thanh toán.'
      setError(message)
      showToast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message,
      })
    } finally {
      setSaving(false)
    }
  }

  if (!canManagePayment) {
    return (
      <EmptyState
        title="Chỉ super admin mới quản lý được thanh toán QR"
        description="Bạn đang đăng nhập bằng tài khoản admin phụ, nên không có quyền chỉnh thông tin nhận thanh toán."
        icon="fa-user-shield"
      />
    )
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Thanh toán</p>
            <h2>Quản lý thanh toán QR</h2>
          </div>
        </div>
        <p>Đang tải cấu hình thanh toán...</p>
      </div>
    )
  }

  const qrPreviewUrl = formData.qrImage || currentSettings?.qrImageUrl || ''
  const hasPaymentUpdateHistory = Boolean(currentSettings?.updatedBy?.email || currentSettings?.updatedBy?.name)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Thanh toán</p>
          <h2>Quản lý thanh toán QR</h2>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <form className="admin-form-card admin-payment-form" onSubmit={handleSubmit}>
        <div className="admin-form-header">
          <div>
            <h3>Thông tin tài khoản nhận tiền</h3>
            <p>Thông tin này sẽ hiển thị cho người dùng khi chọn phương thức thanh toán QR.</p>
          </div>
        </div>

        <div className="admin-form-grid">
          <label>
            Ngân hàng
            <input
              name="bankName"
              value={formData.bankName}
              onChange={handleFormChange}
              placeholder="VD: MB Bank / Vietcombank"
            />
          </label>

          <label>
            Số tài khoản
            <input
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleFormChange}
              placeholder="Nhập số tài khoản nhận tiền"
            />
          </label>

          <label className="admin-form-full">
            Tên chủ tài khoản
            <input
              name="accountName"
              value={formData.accountName}
              onChange={handleFormChange}
              placeholder="Nhập tên chủ tài khoản"
            />
          </label>

          <label className="admin-form-full">
            Nội dung chuyển khoản gợi ý
            <input
              name="transferNote"
              value={formData.transferNote}
              onChange={handleFormChange}
              placeholder="VD: THANHTOAN DONHANG NEXORA"
            />
          </label>

          <div className="admin-form-full admin-image-upload-block">
            <label htmlFor="admin-payment-qr-upload">Ảnh QR thanh toán</label>
            <button
              type="button"
              className={`admin-image-dropzone ${isDraggingImage ? 'is-dragging' : ''}`}
              onClick={handleOpenImagePicker}
              onDragOver={handleImageDragOver}
              onDragLeave={handleImageDragLeave}
              onDrop={handleImageDrop}
              disabled={isReadingImage}
            >
              <span>Kéo ảnh QR vào đây hoặc bấm để chọn file</span>
              <small>Hỗ trợ: jpg, png, webp, gif (tối đa 3MB)</small>
            </button>

            <input
              ref={imageInputRef}
              id="admin-payment-qr-upload"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              disabled={isReadingImage}
            />

            {isReadingImage ? <span className="section-heading-meta">Đang đọc ảnh QR...</span> : null}

            {qrPreviewUrl ? (
              <div className="admin-image-preview admin-payment-qr-preview">
                <img src={qrPreviewUrl} alt="QR thanh toán" />
                <button
                  type="button"
                  className="button button-danger"
                  onClick={handleClearQrImage}
                >
                  Xóa ảnh QR
                </button>
              </div>
            ) : (
              <span className="section-heading-meta">Chưa có ảnh QR thanh toán.</span>
            )}
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="button" disabled={saving || isReadingImage}>
            {saving ? (
              <>
                <ButtonSpinner size="sm" />
                <span>Đang lưu cấu hình...</span>
              </>
            ) : (
              'Lưu cấu hình thanh toán'
            )}
          </button>
        </div>
      </form>

      <div className="admin-table-card admin-payment-meta-card">
        <div className="admin-table-meta">
          <span>Cập nhật gần nhất: {hasPaymentUpdateHistory ? formatDate(currentSettings?.updatedAt) : 'N/A'}</span>
        </div>
        <p>
          <strong>Người cập nhật:</strong>{' '}
          {hasPaymentUpdateHistory
            ? `${currentSettings.updatedBy.name || 'N/A'} (${currentSettings.updatedBy.email || 'N/A'})`
            : 'N/A'}
        </p>
      </div>
    </div>
  )
}

export default AdminPaymentSettings
