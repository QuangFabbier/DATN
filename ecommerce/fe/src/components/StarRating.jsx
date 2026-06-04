import { useMemo, useState } from 'react'

function roundToHalf(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0
  }

  return Math.round(numericValue * 2) / 2
}

function getStarIconType(displayValue, starNumber) {
  if (displayValue >= starNumber) {
    return 'full'
  }

  if (displayValue >= starNumber - 0.5) {
    return 'half'
  }

  return 'empty'
}

function StarRating({
  value = 0,
  max = 5,
  readonly = false,
  size = 'md',
  onChange = null,
  ariaLabel = 'Đánh giá sao',
  showValue = false,
  reviewCount = null,
}) {
  const [hoverValue, setHoverValue] = useState(0)
  const normalizedValue = Math.max(0, Math.min(max, Number(value) || 0))
  const interactiveValue = hoverValue || normalizedValue
  const displayValue = readonly ? roundToHalf(normalizedValue) : interactiveValue

  const stars = useMemo(
    () =>
      Array.from({ length: max }, (_, index) => {
        const starNumber = index + 1
        return {
          starNumber,
          iconType: getStarIconType(displayValue, starNumber),
        }
      }),
    [displayValue, max],
  )

  return (
    <div
      className={`star-rating star-rating-${size} ${readonly ? 'readonly' : 'interactive'}`}
      aria-label={ariaLabel}
    >
      <div className="star-rating-stars" role={readonly ? 'img' : 'radiogroup'} aria-label={ariaLabel}>
        {stars.map((star) => {
          const iconClassName =
            star.iconType === 'full'
              ? 'fa-solid fa-star'
              : star.iconType === 'half'
                ? 'fa-solid fa-star-half-stroke'
                : 'fa-regular fa-star'

          if (readonly || typeof onChange !== 'function') {
            return (
              <span key={star.starNumber} className={`star-rating-star ${star.iconType}`} aria-hidden="true">
                <i className={iconClassName} />
              </span>
            )
          }

          return (
            <button
              key={star.starNumber}
              type="button"
              className={`star-rating-star ${star.iconType}`}
              onMouseEnter={() => setHoverValue(star.starNumber)}
              onMouseLeave={() => setHoverValue(0)}
              onFocus={() => setHoverValue(star.starNumber)}
              onBlur={() => setHoverValue(0)}
              onClick={() => onChange(star.starNumber)}
              role="radio"
              aria-checked={normalizedValue === star.starNumber}
              aria-label={`${star.starNumber} sao`}
            >
              <i className={iconClassName} />
            </button>
          )
        })}
      </div>

      {showValue || reviewCount !== null ? (
        <div className="star-rating-copy">
          {showValue ? <strong>{normalizedValue > 0 ? normalizedValue.toFixed(1) : '0.0'}</strong> : null}
          {reviewCount !== null ? <span>({Number(reviewCount || 0)})</span> : null}
        </div>
      ) : null}
    </div>
  )
}

export default StarRating
