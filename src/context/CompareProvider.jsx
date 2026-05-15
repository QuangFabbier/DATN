import { useEffect, useState } from 'react'
import { CompareContext } from './CompareContext'
import { normalizeProduct } from '../utils/product'

const COMPARE_STORAGE_KEY = 'compareItems'
const MAX_COMPARE_ITEMS = 3

function getStoredCompareItems() {
  const storedCompareItems = localStorage.getItem(COMPARE_STORAGE_KEY)

  if (!storedCompareItems) {
    return []
  }

  try {
    const parsedItems = JSON.parse(storedCompareItems)

    if (!Array.isArray(parsedItems)) {
      localStorage.removeItem(COMPARE_STORAGE_KEY)
      return []
    }

    return parsedItems.map((item) => normalizeProduct(item)).filter((item) => item?.id)
  } catch {
    localStorage.removeItem(COMPARE_STORAGE_KEY)
    return []
  }
}

function CompareProvider({ children }) {
  const [compareItems, setCompareItems] = useState(getStoredCompareItems)
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareItems))
  }, [compareItems])

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
