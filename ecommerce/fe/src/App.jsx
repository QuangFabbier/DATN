import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AccountLayout from './components/account/AccountLayout'
import AdminLayout from './components/admin/AdminLayout'
import MainLayout from './components/MainLayout'
import ScrollToTop from './components/ScrollToTop'
import AuthProvider from './context/AuthProvider'
import CartProvider from './context/CartProvider'
import CompareProvider from './context/CompareProvider'
import FavoritesProvider from './context/FavoritesProvider'
import SearchProvider from './context/SearchProvider'
import ThemeProvider from './context/ThemeProvider'
import ToastProvider from './context/ToastProvider'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts'
import Cart from './pages/Cart'
import Favorites from './pages/Favorites'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Orders from './pages/Orders'
import ProductDetail from './pages/ProductDetail'
import Products from './pages/Products'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Register from './pages/Register'
import WarrantyPolicy from './pages/WarrantyPolicy'
import ReturnPolicy from './pages/ReturnPolicy'
import TermsOfUse from './pages/TermsOfUse'
import ShippingInspectionPolicy from './pages/ShippingInspectionPolicy'
import AccountAIPreferences from './pages/account/AccountAIPreferences'
import AccountAddresses from './pages/account/AccountAddresses'
import AccountAppearance from './pages/account/AccountAppearance'
import AccountNotifications from './pages/account/AccountNotifications'
import AccountOrders from './pages/account/AccountOrders'
import AccountProfile from './pages/account/AccountProfile'
import AccountSecurity from './pages/account/AccountSecurity'
import AccountWishlist from './pages/account/AccountWishlist'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SearchProvider>
              <FavoritesProvider>
                <CartProvider>
                  <CompareProvider>
                    {/* Routes chính của website */}
                    <Routes>
                      <Route path="/" element={<MainLayout />}>
                        <Route index element={<Home />} />
                        <Route path="products" element={<Products />} />
                        <Route path="products/:id" element={<ProductDetail />} />
                        <Route path="cart" element={<Cart />} />
                        <Route path="favorites" element={<Favorites />} />
                        <Route path="orders" element={<Orders />} />
                        <Route path="privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="warranty-policy" element={<WarrantyPolicy />} />
                        <Route path="return-policy" element={<ReturnPolicy />} />
                        <Route path="terms-of-use" element={<TermsOfUse />} />
                        <Route path="shipping-inspection-policy" element={<ShippingInspectionPolicy />} />
                        <Route path="account" element={<AccountLayout />}>
                          <Route index element={<Navigate to="profile" replace />} />
                          <Route path="settings" element={<Navigate to="/account/profile" replace />} />
                          <Route path="profile" element={<AccountProfile />} />
                          <Route path="security" element={<AccountSecurity />} />
                          <Route path="addresses" element={<AccountAddresses />} />
                          <Route path="orders" element={<AccountOrders />} />
                          <Route path="wishlist" element={<AccountWishlist />} />
                          <Route path="notifications" element={<AccountNotifications />} />
                          <Route path="appearance" element={<AccountAppearance />} />
                          <Route path="ai-preferences" element={<AccountAIPreferences />} />
                        </Route>
                        <Route path="login" element={<Login />} />
                        <Route path="register" element={<Register />} />
                        <Route path="admin" element={<AdminLayout />}>
                          <Route index element={<AdminDashboard />} />
                          <Route path="products" element={<AdminProducts />} />
                          <Route path="orders" element={<AdminOrders />} />
                        </Route>
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </CompareProvider>
                </CartProvider>
              </FavoritesProvider>
            </SearchProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
