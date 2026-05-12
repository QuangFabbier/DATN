import { useState } from 'react'
import { FavoritesContext } from './FavoritesContext'

function FavoritesProvider({ children }) {
  const [favoriteItems, setFavoriteItems] = useState([])

  function isFavorite(productId) {
    return favoriteItems.some((item) => item.id === productId)
  }

  function toggleFavorite(product) {
    setFavoriteItems((currentItems) => {
      if (currentItems.some((item) => item.id === product.id)) {
        return currentItems.filter((item) => item.id !== product.id)
      }

      return [...currentItems, product]
    })
  }

  const value = {
    favoriteItems,
    isFavorite,
    toggleFavorite,
  }

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export default FavoritesProvider
