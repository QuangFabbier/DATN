import { useEffect, useMemo, useRef, useState } from 'react'
import { CartContext } from './CartContext'
import { useAuth } from '../hooks/useAuth'
import { getProductStock, normalizeProduct } from '../utils/product'
import {
  canUseStorage,
  getScopedStorageKey,
  readScopedStorageJSON,
  writeScopedStorageJSON,
} from '../utils/storageScope'

const CART_STORAGE_KEY_PREFIX = 'cartItems'
export const CART_ITEM_ADDED_EVENT = 'nexora-cart-item-added'

function resolveCartStorageKey(user) {
  return getScopedStorageKey(CART_STORAGE_KEY_PREFIX, user)
}

function getStoredCartItems(storageKey, user) {
  if (!canUseStorage()) {
    return []
  }

  const storedCartItems = readScopedStorageJSON(localStorage, CART_STORAGE_KEY_PREFIX, [], user)

  if (!Array.isArray(storedCartItems)) {
    localStorage.removeItem(storageKey)
    return []
  }

  return storedCartItems
    .map((item) => {
      const normalizedItem = normalizeProduct(item)
      const quantity = Number(item?.quantity)

      if (!normalizedItem?.id || !Number.isFinite(quantity) || quantity < 1) {
        return null
      }

      const stock = getProductStock(normalizedItem)
      if (stock === 0) {
        return null
      }

      const normalizedQuantity = stock === null ? quantity : Math.min(quantity, stock)

      return {
        ...normalizedItem,
        quantity: Math.max(1, normalizedQuantity),
      }
    })
    .filter(Boolean)
}

function CartProvider({ children }) {
  const { user } = useAuth()
  const cartStorageKey = useMemo(() => resolveCartStorageKey(user), [user])
  const skipNextPersistRef = useRef(false)
  const [cartItems, setCartItems] = useState(() => getStoredCartItems(cartStorageKey, user))

  useEffect(() => {
    queueMicrotask(() => {
      skipNextPersistRef.current = true
      setCartItems(getStoredCartItems(cartStorageKey, user))
    })
  }, [cartStorageKey, user])

  useEffect(() => {
    if (!canUseStorage()) {
      return
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }

    writeScopedStorageJSON(localStorage, CART_STORAGE_KEY_PREFIX, cartItems, user)
  }, [cartItems, cartStorageKey, user])

  function getClampedQuantity(product, quantity) {
    const stock = getProductStock(product)

    if (stock === 0) {
      return 0
    }

    if (stock === null) {
      return Math.max(1, quantity)
    }

    return Math.min(Math.max(1, quantity), stock)
  }

  function addToCart(product, quantity = 1) {
    const normalizedProduct = normalizeProduct(product)

    if (!normalizedProduct?.id) {
      return false
    }

    const nextQuantity = Number(quantity)

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      return false
    }

    let added = false

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === normalizedProduct.id)
      const baseQuantity = existingItem ? existingItem.quantity + nextQuantity : nextQuantity
      const clampedQuantity = getClampedQuantity(normalizedProduct, baseQuantity)

      if (clampedQuantity < 1) {
        return currentItems
      }

      if (existingItem && clampedQuantity === existingItem.quantity) {
        return currentItems
      }

      added = true

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === normalizedProduct.id
            ? { ...item, ...normalizedProduct, quantity: clampedQuantity }
            : item,
        )
      }

      return [...currentItems, { ...normalizedProduct, quantity: clampedQuantity }]
    })

    if (added && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(CART_ITEM_ADDED_EVENT, {
          detail: { productId: normalizedProduct.id },
        }),
      )
    }

    return added
  }

  function removeFromCart(productId) {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== String(productId)))
  }

  function updateQuantity(productId, quantity) {
    const normalizedProductId = String(productId)
    const nextQuantity = Number(quantity)

    if (!Number.isFinite(nextQuantity)) {
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== normalizedProductId) {
          return item
        }

        return {
          ...item,
          quantity: getClampedQuantity(item, nextQuantity),
        }
      }),
    )
  }

  function clearCart() {
    setCartItems([])
  }

  useEffect(() => {
    if (!canUseStorage()) {
      return
    }

    const handleStorageChange = (event) => {
      if (event.key !== cartStorageKey) {
        return
      }

      setCartItems(getStoredCartItems(cartStorageKey, user))
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [cartStorageKey, user])

  const cartItemCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  )

  const cartTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems],
  )

  const value = {
    cartItems,
    cartItemCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartProvider
