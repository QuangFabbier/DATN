import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import { getMe } from '../services/authService'

function getStoredUser() {
  const storedUser = localStorage.getItem('user')

  try {
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

function normalizeUser(userData) {
  if (!userData || typeof userData !== 'object') {
    return null
  }

  return {
    ...userData,
    role: String(userData.role || 'customer').trim().toLowerCase() || 'customer',
    isSuperAdmin: Boolean(userData.isSuperAdmin),
    canManageAdmins: Boolean(userData.canManageAdmins),
    adminLevel: String(userData.adminLevel || '').trim().toLowerCase(),
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => normalizeUser(getStoredUser()))
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  useEffect(() => {
    async function syncCurrentUser() {
      if (!token) {
        return
      }

      try {
        const response = await getMe(token)
        const syncedUser = normalizeUser(response?.user)

        if (!syncedUser) {
          throw new Error('Invalid user profile response')
        }

        localStorage.setItem('user', JSON.stringify(syncedUser))
        setUser(syncedUser)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
      }
    }

    syncCurrentUser()
  }, [token])

  function login(userData, userToken) {
    // Lưu phiên đăng nhập để giữ trạng thái sau khi reload trang.
    const normalizedUser = normalizeUser(userData)

    localStorage.setItem('token', userToken)
    localStorage.setItem('user', JSON.stringify(normalizedUser))
    setToken(userToken)
    setUser(normalizedUser)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
