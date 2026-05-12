import { useState } from 'react'
import { AuthContext } from './AuthContext'

function getStoredUser() {
  const storedUser = localStorage.getItem('user')

  try {
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  function login(userData, userToken) {
    // Lưu phiên đăng nhập để giữ trạng thái sau khi reload trang.
    localStorage.setItem('token', userToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(userToken)
    setUser(userData)
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
