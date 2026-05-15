import { Link } from 'react-router-dom'

function Breadcrumbs({ items = [] }) {
  if (!items.length) {
    return null
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isLastItem = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`}>
              {isLastItem || !item.to ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
