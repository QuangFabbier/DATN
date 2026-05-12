import { useEffect, useMemo, useState } from 'react'
import { CartContext } from './CartContext'
import { getProductStock, normalizeProduct } from '../utils/product'

const CART_STORAGE_KEY = 'cartItems'

function getStoredCartItems() {
  const storedCartItems = localStorage.getItem(CART_STORAGE_KEY)

  if (!storedCartItems) {
    return []
  }

  try {
    const parsedItems = JSON.parse(storedCartItems)

    if (!Array.isArray(parsedItems)) {
      localStorage.removeItem(CART_STORAGE_KEY)
      return []
    }

    return parsedItems
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
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY)
    return []
  }
}

function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(getStoredCartItems)

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems])

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
