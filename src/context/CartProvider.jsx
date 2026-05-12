import { useMemo, useState } from 'react'
import { CartContext } from './CartContext'

function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([])

  function addToCart(product) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...currentItems, { ...product, quantity: 1 }]
    })
  }

  function removeFromCart(productId) {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== productId))
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => (item.id === productId ? { ...item, quantity } : item)),
    )
  }

  function clearCart() {
    setCartItems([])
  }

  const cartTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems],
  )

  const value = {
    cartItems,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartProvider
