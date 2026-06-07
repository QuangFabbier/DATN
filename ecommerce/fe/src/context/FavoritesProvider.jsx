import { useEffect, useMemo, useRef, useState } from 'react'
import { FavoritesContext } from './FavoritesContext'
import { useAuth } from '../hooks/useAuth'
import { normalizeProduct } from '../utils/product'
import {
  canUseStorage,
  getScopedStorageKey,
  readScopedStorageJSON,
  writeScopedStorageJSON,
} from '../utils/storageScope'

const FAVORITES_STORAGE_KEY_PREFIX = 'favoriteItems'
export const FAVORITE_TOGGLED_EVENT = 'nexora-favorite-toggled'

function getStoredFavoriteItems(storageKey, user) {
  if (!canUseStorage()) {
    return []
  }

  const storedFavoriteItems = readScopedStorageJSON(localStorage, FAVORITES_STORAGE_KEY_PREFIX, [], user)

  if (!Array.isArray(storedFavoriteItems)) {
    localStorage.removeItem(storageKey)
    return []
  }

  return storedFavoriteItems.map((item) => normalizeProduct(item)).filter((item) => item?.id)
}

function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const favoriteStorageKey = useMemo(
    () => getScopedStorageKey(FAVORITES_STORAGE_KEY_PREFIX, user),
    [user],
  )
  const skipNextPersistRef = useRef(false)
  const [favoriteItems, setFavoriteItems] = useState(() => getStoredFavoriteItems(favoriteStorageKey, user))

  useEffect(() => {
    queueMicrotask(() => {
      skipNextPersistRef.current = true
      setFavoriteItems(getStoredFavoriteItems(favoriteStorageKey, user))
    })
  }, [favoriteStorageKey, user])

  useEffect(() => {
    if (!canUseStorage()) {
      return
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }

    writeScopedStorageJSON(localStorage, FAVORITES_STORAGE_KEY_PREFIX, favoriteItems, user)
  }, [favoriteItems, favoriteStorageKey, user])

  useEffect(() => {
    if (!canUseStorage()) {
      return
    }

    const handleStorageChange = (event) => {
      if (event.key !== favoriteStorageKey) {
        return
      }

      setFavoriteItems(getStoredFavoriteItems(favoriteStorageKey, user))
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [favoriteStorageKey, user])

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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(FAVORITE_TOGGLED_EVENT, {
          detail: {
            added,
            productId: normalizedProduct.id,
          },
        }),
      )
    }

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
