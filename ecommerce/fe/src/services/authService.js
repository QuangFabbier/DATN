import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API_URL = `${API_BASE_URL}/auth`

export async function register(userData) {
  const response = await axios.post(`${API_URL}/register`, userData)
  return response.data
}

export async function login(credentials) {
  const response = await axios.post(`${API_URL}/login`, credentials)
  return response.data
}

export async function getMe(token) {
  const response = await axios.get(`${API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}

export async function updateMyAvatar(token, avatarDataUrl = '') {
  const response = await axios.put(
    `${API_URL}/me/avatar`,
    { avatar: String(avatarDataUrl || '') },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  return response.data
}
