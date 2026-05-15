function SettingsToggle({
  checked,
  description = '',
  id,
  isDisabled = false,
  label,
  onChange,
}) {
  return (
    <div className="account-toggle-row">
      <div className="account-toggle-copy">
        <p>{label}</p>
        {description ? <span>{description}</span> : null}
      </div>

      <button
        id={id}
        type="button"
        className={`account-toggle ${checked ? 'active' : ''}`}
        role="switch"
        aria-checked={checked}
        disabled={isDisabled}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  )
}

export default SettingsToggle
