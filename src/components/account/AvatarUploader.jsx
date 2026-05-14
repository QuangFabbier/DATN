import { useRef, useState } from 'react'

const MAX_AVATAR_SIZE = 2 * 1024 * 1024

function AvatarUploader({ name = 'Ảnh đại diện', onChange, value }) {
  const inputRef = useRef(null)
  const [errorMessage, setErrorMessage] = useState('')

  function handleOpenFileDialog() {
    if (!inputRef.current) {
      return
    }

    inputRef.current.click()
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn file ảnh hợp lệ.')
      return
    }

    if (selectedFile.size > MAX_AVATAR_SIZE) {
      setErrorMessage('Ảnh vượt quá 2MB, vui lòng chọn file nhỏ hơn.')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setErrorMessage('')
      onChange(String(reader.result || ''))
    }

    reader.readAsDataURL(selectedFile)
  }

  function handleRemoveAvatar() {
    setErrorMessage('')
    onChange('')

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="account-avatar-uploader">
      <div className="account-avatar-preview" aria-hidden="true">
        {value ? <img src={value} alt="Avatar preview" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}
      </div>

      <div className="account-avatar-actions">
        <p>Ảnh đại diện của bạn</p>
        <span>Dùng ảnh vuông để hiển thị đẹp hơn ở account center.</span>

        <div className="account-avatar-button-row">
          <button type="button" className="button button-light" onClick={handleOpenFileDialog}>
            Chọn ảnh
          </button>
          {value ? (
            <button type="button" className="button button-outline" onClick={handleRemoveAvatar}>
              Gỡ ảnh
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="account-avatar-input"
          aria-label="Tải ảnh đại diện"
        />

        {errorMessage ? <small className="field-error">{errorMessage}</small> : null}
      </div>
    </div>
  )
}

export default AvatarUploader
