import { useMemo, useState } from 'react'
import SettingsCard from '../../components/account/SettingsCard'
import SettingsSection from '../../components/account/SettingsSection'
import { Skeleton } from '../../components/Skeleton'
import { ButtonSpinner } from '../../components/Spinner'
import { useInitialRender } from '../../hooks/useInitialRender'
import { useToast } from '../../hooks/useToast'
import { getSecurityState, saveSecurityState } from '../../services/accountStorage'
import { wait } from '../../utils/timing'

function getPasswordStrength(password) {
  let score = 0

  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) {
    return { tone: 'weak', label: 'Mật khẩu yếu' }
  }

  if (score === 2) {
    return { tone: 'medium', label: 'Mật khẩu trung bình' }
  }

  return { tone: 'strong', label: 'Mật khẩu mạnh' }
}

const mockLoggedDevices = [
  { id: 'device-macbook', name: 'MacBook Pro', location: 'Hà Nội', lastActive: 'Đang hoạt động' },
  { id: 'device-iphone', name: 'iPhone 15', location: 'Thanh Hóa', lastActive: '1 giờ trước' },
]

const mockSessions = [
  { id: 'session-1', device: 'Chrome - Windows', ip: '113.22.145.XX', time: '14/05/2026 20:10' },
  { id: 'session-2', device: 'Safari - iOS', ip: '113.22.145.XX', time: '13/05/2026 23:48' },
  { id: 'session-3', device: 'Edge - Windows', ip: '171.244.17.XX', time: '11/05/2026 10:14' },
]

function AccountSecurity() {
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()
  const [securityState, setSecurityState] = useState(() => getSecurityState())
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.newPassword.trim()),
    [formData.newPassword],
  )

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }))
  }

  function validateSecurityForm() {
    const nextErrors = {}
    const normalizedCurrentPassword = formData.currentPassword.trim()
    const normalizedNewPassword = formData.newPassword.trim()
    const normalizedConfirmPassword = formData.confirmPassword.trim()

    if (!normalizedCurrentPassword) {
      nextErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    }

    if (securityState.password && normalizedCurrentPassword !== securityState.password) {
      nextErrors.currentPassword = 'Mật khẩu hiện tại không chính xác.'
    }

    if (normalizedNewPassword.length < 8) {
      nextErrors.newPassword = 'Mật khẩu mới cần ít nhất 8 ký tự.'
    }

    if (normalizedConfirmPassword !== normalizedNewPassword) {
      nextErrors.confirmPassword = 'Xác nhận mật khẩu chưa khớp.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSavePassword(event) {
    event.preventDefault()

    if (!validateSecurityForm() || isSaving) {
      showToast({
        type: 'warning',
        title: 'Chưa thể cập nhật mật khẩu',
        message: 'Vui lòng kiểm tra lại thông tin bạn đã nhập.',
      })
      return
    }

    setIsSaving(true)
    await wait(780)

    const nextSecurityState = saveSecurityState({
      password: formData.newPassword.trim(),
      updatedAt: new Date().toISOString(),
    })

    setSecurityState(nextSecurityState)
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setIsSaving(false)

    showToast({
      type: 'success',
      title: 'Đã đổi mật khẩu',
      message: 'Mật khẩu mới đã được lưu cho môi trường frontend demo.',
    })
  }

  if (!isInitialRenderReady) {
    return (
      <div className="account-settings-section">
        <Skeleton style={{ width: '45%', height: 22 }} />
        <Skeleton style={{ width: '100%', height: 240, borderRadius: 20 }} />
      </div>
    )
  }

  return (
    <SettingsSection
      eyebrow="Bảo mật"
      title="Cài đặt bảo mật"
      description="Đổi mật khẩu và theo dõi phiên đăng nhập gần đây của tài khoản Nexora của bạn."
      actions={
        <button type="submit" form="account-security-form" className="button" disabled={isSaving}>
          {isSaving ? (
            <>
              <ButtonSpinner size="sm" />
              <span>Đang cập nhật...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-shield" aria-hidden="true" />
              <span>Cập nhật mật khẩu</span>
            </>
          )}
        </button>
      }
    >
      <form id="account-security-form" className="account-settings-card" onSubmit={handleSavePassword}>
        <div className="account-grid">
          {[
            { name: 'currentPassword', label: 'Mật khẩu hiện tại' },
            { name: 'newPassword', label: 'Mật khẩu mới' },
            { name: 'confirmPassword', label: 'Xác nhận mật khẩu mới' },
          ].map((field) => {
            const isVisible = visiblePasswords[field.name]

            return (
              <div key={field.name} className="account-input-field">
                <span>{field.label}</span>
                <div className="account-password-input">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="account-password-toggle"
                    onClick={() => {
                      setVisiblePasswords((currentState) => ({
                        ...currentState,
                        [field.name]: !currentState[field.name],
                      }))
                    }}
                    aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <i className={`fa-solid ${isVisible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                  </button>
                </div>
                {errors[field.name] ? <small className="field-error">{errors[field.name]}</small> : null}
              </div>
            )
          })}

          <div className="account-password-strength account-full-width">
            <div className="account-strength-track" aria-hidden="true">
              <div className={`account-strength-fill ${passwordStrength.tone}`} />
            </div>
            <p className="account-strength-copy">{passwordStrength.label}</p>
          </div>
        </div>
      </form>

      <SettingsCard>
        <h3>Thiết bị đã đăng nhập</h3>
        <div className="account-status-grid">
          {mockLoggedDevices.map((device) => (
            <article key={device.id} className="account-status-tile">
              <p>{device.name}</p>
              <strong>{device.location}</strong>
              <span>{device.lastActive}</span>
            </article>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <h3>Two-factor authentication</h3>
        <p className="account-hint">
          Chưa kích hoạt 2FA. Ở bản backend thật, bạn có thể thêm OTP app hoặc SMS để tăng bảo mật.
        </p>
      </SettingsCard>

      <SettingsCard>
        <h3>Phiên đăng nhập gần đây</h3>
        <div className="account-status-grid">
          {mockSessions.map((session) => (
            <article key={session.id} className="account-status-tile">
              <p>{session.device}</p>
              <strong>{session.ip}</strong>
              <span>{session.time}</span>
            </article>
          ))}
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}

export default AccountSecurity
