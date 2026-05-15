import { useState } from 'react'
import SettingsCard from '../../components/account/SettingsCard'
import SettingsSection from '../../components/account/SettingsSection'
import SettingsToggle from '../../components/account/SettingsToggle'
import { Skeleton } from '../../components/Skeleton'
import { useInitialRender } from '../../hooks/useInitialRender'
import { useTheme } from '../../hooks/useTheme'
import { useToast } from '../../hooks/useToast'
import { saveAppearancePreferences } from '../../services/accountStorage'

const themeOptions = [
  { value: 'light', label: 'Light', hint: 'Sáng rõ, phù hợp môi trường đủ ánh sáng.' },
  { value: 'dark', label: 'Dark', hint: 'Giảm chói, phù hợp buổi tối hoặc màn hình OLED.' },
  { value: 'system', label: 'System', hint: 'Tự động theo cài đặt hệ điều hành.' },
]

function AccountAppearance() {
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()
  const { appearancePreferences, resolvedTheme, setAppearancePreferences, setTheme, theme } = useTheme()

  const [localAppearance, setLocalAppearance] = useState(appearancePreferences)

  function handleThemeChange(nextTheme) {
    setTheme(nextTheme)

    showToast({
      type: 'success',
      title: 'Đã cập nhật giao diện',
      message: `Theme đã chuyển sang ${nextTheme === 'system' ? `System (${resolvedTheme})` : nextTheme}.`,
      duration: 2200,
    })
  }

  function handleAppearanceToggle(key, nextValue) {
    const nextAppearance = {
      ...localAppearance,
      [key]: nextValue,
    }

    setLocalAppearance(nextAppearance)
    setAppearancePreferences(nextAppearance)
    saveAppearancePreferences(nextAppearance)

    showToast({
      type: 'info',
      title: 'Đã cập nhật tùy chọn hiển thị',
      message: 'Cấu hình appearance đã được áp dụng realtime.',
      duration: 2000,
    })
  }

  if (!isInitialRenderReady) {
    return (
      <div className="account-settings-section">
        <Skeleton style={{ width: '40%', height: 22 }} />
        <Skeleton style={{ width: '100%', height: 240, borderRadius: 20 }} />
      </div>
    )
  }

  return (
    <SettingsSection
      eyebrow="Giao diện"
      title="Appearance settings"
      description="Tinh chỉnh chế độ hiển thị để tối ưu trải nghiệm mua sắm và tư vấn AI theo thiết bị của bạn."
    >
      <SettingsCard>
        <h3>Theme mode</h3>
        <p className="account-hint">Theme hiện tại: {theme === 'system' ? `System (${resolvedTheme})` : theme}</p>

        <div className="account-theme-preview-grid">
          {themeOptions.map((themeOption) => (
            <button
              key={themeOption.value}
              type="button"
              className={`account-theme-preview-card ${theme === themeOption.value ? 'active' : ''}`}
              onClick={() => handleThemeChange(themeOption.value)}
            >
              <div className={`account-theme-mini-ui ${themeOption.value}`} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <strong>{themeOption.label}</strong>
              <p>{themeOption.hint}</p>
            </button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <h3>Accessibility and comfort</h3>
        <div className="account-toggle-group">
          <SettingsToggle
            checked={localAppearance.compactMode}
            label="Compact mode"
            description="Giảm khoảng trắng và tăng mật độ thông tin trong account center."
            onChange={(nextValue) => handleAppearanceToggle('compactMode', nextValue)}
          />

          <SettingsToggle
            checked={localAppearance.reduceMotion}
            label="Reduce motion"
            description="Giảm chuyển động để trải nghiệm ổn định và tập trung hơn."
            onChange={(nextValue) => handleAppearanceToggle('reduceMotion', nextValue)}
          />
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}

export default AccountAppearance
