import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API_URL = `${API_BASE_URL}/auth`

function authConfig(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

export async function register(userData) {
  const response = await axios.post(`${API_URL}/register`, userData)
  return response.data
}

export async function login(credentials) {
  const response = await axios.post(`${API_URL}/login`, credentials)
  return response.data
}

export async function getMe(token) {
  const response = await axios.get(`${API_URL}/me`, authConfig(token))

  return response.data
}

export async function updateMyAvatar(token, avatarDataUrl = '') {
  const response = await axios.put(
    `${API_URL}/me/avatar`,
    { avatar: String(avatarDataUrl || '') },
    authConfig(token),
  )

  return response.data
}

export async function getAdminAccessList(token) {
  const response = await axios.get(`${API_URL}/admin-access`, authConfig(token))
  return response.data
}

export async function grantSubAdminAccess(token, email) {
  const response = await axios.post(
    `${API_URL}/admin-access/grant`,
    { email: String(email || '').trim() },
    authConfig(token),
  )
  return response.data
}

export async function revokeSubAdminAccess(token, email) {
  const response = await axios.post(
    `${API_URL}/admin-access/revoke`,
    { email: String(email || '').trim() },
    authConfig(token),
  )
  return response.data
}
