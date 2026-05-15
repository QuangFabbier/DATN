function PreferenceSelector({
  description = '',
  label,
  multiple = true,
  onChange,
  options = [],
  value,
}) {
  function handleOptionClick(optionValue) {
    if (multiple) {
      const selectedValues = Array.isArray(value) ? value : []
      const exists = selectedValues.includes(optionValue)
      const nextValues = exists
        ? selectedValues.filter((item) => item !== optionValue)
        : [...selectedValues, optionValue]

      onChange(nextValues)
      return
    }

    const selectedValue = String(value || '')
    onChange(selectedValue === optionValue ? '' : optionValue)
  }

  return (
    <div className="account-preference-field">
      <div className="account-preference-header">
        <p>{label}</p>
        {description ? <span>{description}</span> : null}
      </div>

      <div className="account-chip-grid">
        {options.map((option) => {
          const isActive = multiple
            ? Array.isArray(value) && value.includes(option.value)
            : String(value || '') === option.value

          return (
            <button
              key={option.value}
              type="button"
              className={`account-chip ${isActive ? 'active' : ''}`}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PreferenceSelector
