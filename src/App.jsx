import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import MainLayout from './components/MainLayout'
import AuthProvider from './context/AuthProvider'
import CartProvider from './context/CartProvider'
import FavoritesProvider from './context/FavoritesProvider'
import SearchProvider from './context/SearchProvider'
import Cart from './pages/Cart'
import Favorites from './pages/Favorites'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Orders from './pages/Orders'
import ProductDetail from './pages/ProductDetail'
import Products from './pages/Products'
import Register from './pages/Register'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SearchProvider>
          <FavoritesProvider>
            <CartProvider>
              {/* Routes chính của website */}
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />
                  <Route path="products" element={<Products />} />
                  <Route path="products/:id" element={<ProductDetail />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="favorites" element={<Favorites />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </CartProvider>
          </FavoritesProvider>
        </SearchProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
