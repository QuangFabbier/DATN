function EmptyState({
  action,
  description,
  icon = 'fa-box-open',
  tone = 'default',
  title,
}) {
  return (
    <div className={`empty-state empty-state-${tone}`}>
      <div className="empty-state-visual" aria-hidden="true">
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="empty-state-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  )
}

export default EmptyState
