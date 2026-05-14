import { useId } from 'react'

function Tooltip({ children, content, position = 'top' }) {
  const tooltipId = useId()

  return (
    <span className="tooltip-wrapper">
      <span aria-describedby={tooltipId} className="tooltip-trigger">
        {children}
      </span>
      <span id={tooltipId} role="tooltip" className={`tooltip-bubble tooltip-${position}`}>
        {content}
      </span>
    </span>
  )
}

export default Tooltip
