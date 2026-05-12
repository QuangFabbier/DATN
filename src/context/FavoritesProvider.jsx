import { useEffect, useState } from 'react'
import { FavoritesContext } from './FavoritesContext'
import { normalizeProduct } from '../utils/product'

const FAVORITES_STORAGE_KEY = 'favoriteItems'

function getStoredFavoriteItems() {
  const storedFavoriteItems = localStorage.getItem(FAVORITES_STORAGE_KEY)

  if (!storedFavoriteItems) {
    return []
  }

  try {
    const parsedItems = JSON.parse(storedFavoriteItems)

    if (!Array.isArray(parsedItems)) {
      localStorage.removeItem(FAVORITES_STORAGE_KEY)
      return []
    }

    return parsedItems.map((item) => normalizeProduct(item)).filter((item) => item?.id)
  } catch {
    localStorage.removeItem(FAVORITES_STORAGE_KEY)
    return []
  }
}

function FavoritesProvider({ children }) {
  const [favoriteItems, setFavoriteItems] = useState(getStoredFavoriteItems)

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteItems))
  }, [favoriteItems])

  function isFavorite(productId) {
    const normalizedProductId = String(productId)

    return favoriteItems.some((item) => item.id === normalizedProductId)
  }

  function toggleFavorite(product) {
    const normalizedProduct = normalizeProduct(product)

    if (!normalizedProduct?.id) {
      return false
    }

    let added = false

    setFavoriteItems((currentItems) => {
      if (currentItems.some((item) => item.id === normalizedProduct.id)) {
        return currentItems.filter((item) => item.id !== normalizedProduct.id)
      }

      added = true
      return [...currentItems, normalizedProduct]
    })

    return added
  }

  function removeFavorite(productId) {
    const normalizedProductId = String(productId)

    setFavoriteItems((currentItems) => currentItems.filter((item) => item.id !== normalizedProductId))
  }

  const value = {
    favoriteItems,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  }

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export default FavoritesProvider
