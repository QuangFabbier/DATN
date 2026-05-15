function SettingsSection({
  actions = null,
  children,
  className = '',
  description = '',
  eyebrow = 'Cài đặt',
  title,
}) {
  return (
    <section className={`account-settings-section ${className}`.trim()}>
      <header className="account-settings-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {description ? <p className="account-settings-description">{description}</p> : null}
        </div>

        {actions ? <div className="account-settings-actions">{actions}</div> : null}
      </header>

      {children}
    </section>
  )
}

export default SettingsSection
