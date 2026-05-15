import { useState } from 'react'
import PreferenceSelector from '../../components/account/PreferenceSelector'
import SettingsCard from '../../components/account/SettingsCard'
import SettingsSection from '../../components/account/SettingsSection'
import { Skeleton } from '../../components/Skeleton'
import { ButtonSpinner } from '../../components/Spinner'
import { useInitialRender } from '../../hooks/useInitialRender'
import { useToast } from '../../hooks/useToast'
import { getAIPreferences, saveAIPreferences } from '../../services/accountStorage'
import { wait } from '../../utils/timing'

const interestOptions = [
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Coding', label: 'Coding' },
  { value: 'Office', label: 'Office' },
  { value: 'Photography', label: 'Photography' },
  { value: 'Music', label: 'Music' },
  { value: 'Content Creation', label: 'Content Creation' },
  { value: 'Streaming', label: 'Streaming' },
]

const categoryOptions = [
  { value: 'Laptop', label: 'Laptop' },
  { value: 'Phones', label: 'Phones' },
  { value: 'Audio', label: 'Audio' },
  { value: 'Accessories', label: 'Accessories' },
  { value: 'Monitor', label: 'Monitor' },
]

const budgetOptions = [
  { value: 'Budget', label: 'Budget' },
  { value: 'Mid-range', label: 'Mid-range' },
  { value: 'Premium', label: 'Premium' },
]

const priorityOptions = [
  { value: 'Performance', label: 'Performance' },
  { value: 'Battery', label: 'Battery' },
  { value: 'Camera', label: 'Camera' },
  { value: 'Design', label: 'Design' },
  { value: 'Value', label: 'Value' },
  { value: 'Gaming', label: 'Gaming' },
]

function AccountAIPreferences() {
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()
  const [aiPreferences, setAIPreferences] = useState(getAIPreferences)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSavePreferences() {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    await wait(420)

    saveAIPreferences(aiPreferences)
    setIsSaving(false)

    showToast({
      type: 'success',
      title: 'Đã lưu AI Preferences',
      message: 'AI consultant đã có dữ liệu để cá nhân hóa tư vấn ở các bước tiếp theo.',
    })
  }

  if (!isInitialRenderReady) {
    return (
      <div className="account-settings-section">
        <Skeleton style={{ width: '48%', height: 22 }} />
        <Skeleton style={{ width: '100%', height: 260, borderRadius: 20 }} />
      </div>
    )
  }

  return (
    <SettingsSection
      eyebrow="AI Profile"
      title="AI Preferences"
      description="Thiết lập sở thích mua sắm để Nexora AI consultant gợi ý sát nhu cầu và ngân sách của bạn."
      actions={
        <button type="button" className="button" onClick={handleSavePreferences} disabled={isSaving}>
          {isSaving ? (
            <>
              <ButtonSpinner size="sm" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
              <span>Lưu AI Preferences</span>
            </>
          )}
        </button>
      }
    >
      <SettingsCard>
        <PreferenceSelector
          label="Interests"
          description="Các mối quan tâm chính để AI hiểu ngữ cảnh sản phẩm bạn hay tìm."
          options={interestOptions}
          value={aiPreferences.interests}
          onChange={(nextInterests) => {
            setAIPreferences((currentPreferences) => ({
              ...currentPreferences,
              interests: nextInterests,
            }))
          }}
        />
      </SettingsCard>

      <SettingsCard>
        <PreferenceSelector
          label="Favorite Categories"
          description="Nhóm sản phẩm bạn ưu tiên để AI gợi ý danh sách nhanh hơn."
          options={categoryOptions}
          value={aiPreferences.favoriteCategories}
          onChange={(nextCategories) => {
            setAIPreferences((currentPreferences) => ({
              ...currentPreferences,
              favoriteCategories: nextCategories,
            }))
          }}
        />
      </SettingsCard>

      <SettingsCard>
        <PreferenceSelector
          label="Budget Preference"
          description="Khoảng ngân sách bạn thường tham chiếu khi ra quyết định mua."
          multiple={false}
          options={budgetOptions}
          value={aiPreferences.budgetPreference}
          onChange={(nextBudgetPreference) => {
            setAIPreferences((currentPreferences) => ({
              ...currentPreferences,
              budgetPreference: nextBudgetPreference,
            }))
          }}
        />
      </SettingsCard>

      <SettingsCard>
        <PreferenceSelector
          label="Shopping Priorities"
          description="Tiêu chí quan trọng nhất khi AI xếp hạng đề xuất sản phẩm."
          options={priorityOptions}
          value={aiPreferences.shoppingPriorities}
          onChange={(nextPriorities) => {
            setAIPreferences((currentPreferences) => ({
              ...currentPreferences,
              shoppingPriorities: nextPriorities,
            }))
          }}
        />
      </SettingsCard>
    </SettingsSection>
  )
}

export default AccountAIPreferences
