import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerRequest } from '../services/authService'

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((currentData) => ({ ...currentData, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await registerRequest(formData)
      const successMessage = 'Đăng ký thành công. Vui lòng đăng nhập.'

      setSuccess(successMessage)
      setTimeout(() => {
        navigate('/login', { state: { successMessage } })
      }, 800)
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <form className="form-card auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Tài khoản</p>
        <h1>Đăng ký</h1>

        {success && <p className="auth-message">{success}</p>}
        {error && <p className="auth-error">{error}</p>}

        <label>
          Họ tên
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Nhập họ tên"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@example.com"
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Tạo mật khẩu"
          />
        </label>
        <button type="submit" className="button" disabled={loading}>
          {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>
        <p>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </section>
  )
}

export default Register
