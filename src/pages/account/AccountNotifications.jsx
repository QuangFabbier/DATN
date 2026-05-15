import { useState } from 'react'
import SettingsCard from '../../components/account/SettingsCard'
import SettingsSection from '../../components/account/SettingsSection'
import SettingsToggle from '../../components/account/SettingsToggle'
import { Skeleton } from '../../components/Skeleton'
import { ButtonSpinner } from '../../components/Spinner'
import { useInitialRender } from '../../hooks/useInitialRender'
import { useToast } from '../../hooks/useToast'
import { getNotifications, saveNotifications } from '../../services/accountStorage'
import { wait } from '../../utils/timing'

const notificationFields = [
  {
    key: 'emailNotifications',
    label: 'Email notifications',
    description: 'Nhận email về thay đổi quan trọng trong tài khoản.',
  },
  {
    key: 'promotions',
    label: 'Promotions',
    description: 'Thông tin ưu đãi, flash sale và các chiến dịch giảm giá.',
  },
  {
    key: 'orderUpdates',
    label: 'Order updates',
    description: 'Cập nhật xác nhận đơn, giao hàng và trạng thái hoàn thành.',
  },
  {
    key: 'aiRecommendations',
    label: 'AI recommendations',
    description: 'Đề xuất sản phẩm cá nhân hóa theo hành vi và sở thích.',
  },
  {
    key: 'securityAlerts',
    label: 'Security alerts',
    description: 'Cảnh báo đăng nhập lạ hoặc thay đổi quan trọng về bảo mật.',
  },
]

function AccountNotifications() {
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState(getNotifications)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSaveNotifications() {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    await wait(420)

    saveNotifications(notifications)
    setIsSaving(false)

    showToast({
      type: 'success',
      title: 'Đã lưu cài đặt thông báo',
      message: 'Các tùy chọn thông báo đã được cập nhật thành công.',
    })
  }

  if (!isInitialRenderReady) {
    return (
      <div className="account-settings-section">
        <Skeleton style={{ width: '46%', height: 22 }} />
        <Skeleton style={{ width: '100%', height: 260, borderRadius: 20 }} />
      </div>
    )
  }

  return (
    <SettingsSection
      eyebrow="Thông báo"
      title="Notification settings"
      description="Chọn loại thông báo bạn muốn nhận từ Nexora để cân bằng giữa cập nhật và tập trung."
      actions={
        <button type="button" className="button" onClick={handleSaveNotifications} disabled={isSaving}>
          {isSaving ? (
            <>
              <ButtonSpinner size="sm" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
              <span>Lưu cài đặt</span>
            </>
          )}
        </button>
      }
    >
      <SettingsCard>
        <div className="account-toggle-group">
          {notificationFields.map((notificationField) => (
            <SettingsToggle
              key={notificationField.key}
              checked={Boolean(notifications[notificationField.key])}
              label={notificationField.label}
              description={notificationField.description}
              onChange={(nextValue) => {
                setNotifications((currentNotifications) => ({
                  ...currentNotifications,
                  [notificationField.key]: nextValue,
                }))
              }}
            />
          ))}
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}

export default AccountNotifications
