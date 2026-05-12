import axios from 'axios'

const API_URL = 'http://localhost:5000/api/products'

export async function getProducts() {
  const response = await axios.get(API_URL)
  return response.data
}

export async function getProductById(id) {
  const response = await axios.get(`${API_URL}/${id}`)
  return response.data
}
