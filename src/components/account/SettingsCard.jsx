function SettingsCard({ children, className = '' }) {
  return <article className={`account-settings-card ${className}`.trim()}>{children}</article>
}

export default SettingsCard
