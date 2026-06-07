import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdminInventoryDashboard from '../AdminInventoryDashboard'

let authState
let toastSpy

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: toastSpy }),
}))

vi.mock('../../../services/inventoryService', () => ({
  getInventoryDashboard: vi.fn(),
  getInventoryInsights: vi.fn(),
}))

vi.mock('../../../utils/timing', () => ({
  withMinimumDelay: (value) => value,
}))

const inventoryService = await import('../../../services/inventoryService')

describe('AdminInventoryDashboard', () => {
  beforeEach(() => {
    authState = {
      token: 'token',
      isAuthenticated: true,
      user: { role: 'admin' },
    }
    toastSpy = vi.fn()

    inventoryService.getInventoryDashboard.mockResolvedValue({
      totalProducts: 12,
      totalInventoryValue: 120000000,
      lowStockProducts: 2,
      outOfStockProducts: 1,
      recentActivities: [
        {
          id: 'txn-1',
          type: 'IMPORT',
          quantity: 5,
          stockBefore: 10,
          stockAfter: 15,
          referenceType: 'INVENTORY_IMPORT',
          referenceId: 'IMP-001',
          product: { name: 'Laptop A' },
          createdAt: new Date().toISOString(),
        },
      ],
    })

    inventoryService.getInventoryInsights.mockResolvedValue({
      summary: 'Cần nhập thêm hàng cho laptop.',
      recommendations: [
        { type: 'LOW_STOCK', productId: 'p1', message: 'Laptop A sắp hết hàng.' },
      ],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard metrics and AI recommendations', async () => {
    render(
      <MemoryRouter>
        <AdminInventoryDashboard />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Dashboard kho')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Cần nhập thêm hàng cho laptop.')).toBeInTheDocument()
    expect(screen.getByText('Laptop A sắp hết hàng.')).toBeInTheDocument()
    expect(toastSpy).not.toHaveBeenCalled()
  })
})
