import { useId } from 'react'

function SettingsInput({
  as = 'input',
  children = null,
  className = '',
  error = '',
  fieldClassName = '',
  hint = '',
  id,
  inputClassName = '',
  label,
  ...rest
}) {
  const inputId = useId()
  const fieldId = id || inputId
  const Element = as

  return (
    <label className={`account-input-field ${fieldClassName}`.trim()} htmlFor={fieldId}>
      <span>{label}</span>
      <Element id={fieldId} className={`${className} ${inputClassName}`.trim()} {...rest}>
        {children}
      </Element>
      {hint ? <small className="account-input-hint">{hint}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  )
}

export default SettingsInput
