import { useEffect, useMemo, useRef, useState } from 'react'
import { CompareContext } from './CompareContext'
import { useAuth } from '../hooks/useAuth'
import { normalizeProduct } from '../utils/product'
import {
  canUseStorage,
  getScopedStorageKey,
  readScopedStorageJSON,
  writeScopedStorageJSON,
} from '../utils/storageScope'

const COMPARE_STORAGE_KEY_PREFIX = 'compareItems'
const MAX_COMPARE_ITEMS = 3

function getStoredCompareItems(storageKey, user) {
  if (!canUseStorage()) {
    return []
  }

  const storedCompareItems = readScopedStorageJSON(localStorage, COMPARE_STORAGE_KEY_PREFIX, [], user)

  if (!Array.isArray(storedCompareItems)) {
    localStorage.removeItem(storageKey)
    return []
  }

  return storedCompareItems.map((item) => normalizeProduct(item)).filter((item) => item?.id)
}

function CompareProvider({ children }) {
  const { user } = useAuth()
  const compareStorageKey = useMemo(
    () => getScopedStorageKey(COMPARE_STORAGE_KEY_PREFIX, user),
    [user],
  )
  const skipNextPersistRef = useRef(false)
  const [compareItems, setCompareItems] = useState(() => getStoredCompareItems(compareStorageKey, user))
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      skipNextPersistRef.current = true
      setCompareItems(getStoredCompareItems(compareStorageKey, user))
    })
  }, [compareStorageKey, user])

  useEffect(() => {
    if (!canUseStorage()) {
      return
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }

    writeScopedStorageJSON(localStorage, COMPARE_STORAGE_KEY_PREFIX, compareItems, user)
  }, [compareItems, compareStorageKey, user])

  useEffect(() => {
    if (!canUseStorage()) {
      return
    }

    const handleStorageChange = (event) => {
      if (event.key !== compareStorageKey) {
        return
      }

      setCompareItems(getStoredCompareItems(compareStorageKey, user))
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [compareStorageKey, user])

  function isCompared(productId) {
    return compareItems.some((item) => item.id === String(productId))
  }

  function toggleCompare(product) {
    const normalizedProduct = normalizeProduct(product)

    if (!normalizedProduct?.id) {
      return { status: 'invalid' }
    }

    let result = { status: 'invalid' }

    setCompareItems((currentItems) => {
      if (currentItems.some((item) => item.id === normalizedProduct.id)) {
        result = { status: 'removed' }
        return currentItems.filter((item) => item.id !== normalizedProduct.id)
      }

      if (currentItems.length >= MAX_COMPARE_ITEMS) {
        result = { status: 'limit' }
        return currentItems
      }

      result = { status: 'added' }
      return [...currentItems, normalizedProduct]
    })

    return result
  }

  function removeCompare(productId) {
    setCompareItems((currentItems) => currentItems.filter((item) => item.id !== String(productId)))
  }

  function clearCompare() {
    setCompareItems([])
    setIsCompareOpen(false)
  }

  return (
    <CompareContext.Provider
      value={{
        clearCompare,
        compareItems,
        isCompared,
        isCompareOpen,
        removeCompare,
        setIsCompareOpen,
        toggleCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  )
}

export default CompareProvider
