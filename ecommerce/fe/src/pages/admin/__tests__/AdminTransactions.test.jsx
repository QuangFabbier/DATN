import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminTransactions from '../AdminTransactions'

let authState
let toastSpy

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: toastSpy }),
}))

vi.mock('../../../services/productService', () => ({
  getProducts: vi.fn(),
}))

vi.mock('../../../services/inventoryService', () => ({
  getInventoryTransactions: vi.fn(),
}))

const productService = await import('../../../services/productService')
const inventoryService = await import('../../../services/inventoryService')

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('AdminTransactions', () => {
  beforeEach(() => {
    authState = {
      token: 'token',
      isAuthenticated: true,
      user: { role: 'admin' },
    }
    toastSpy = vi.fn()

    productService.getProducts.mockResolvedValue([
      {
        id: 'p1',
        name: 'Laptop A',
        category: 'Laptop',
      },
    ])

    inventoryService.getInventoryTransactions.mockResolvedValue({
      items: [
        {
          id: 'txn-1',
          type: 'IMPORT',
          quantity: 5,
          stockBefore: 10,
          stockAfter: 15,
          referenceType: 'INVENTORY_IMPORT',
          referenceId: 'IMP-001',
          product: { name: 'Laptop A', category: 'Laptop' },
          performedBy: { name: 'Admin', email: 'admin@test.local' },
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders transaction history and applies filters', async () => {
    renderWithRouter(<AdminTransactions />)

    expect(await screen.findByText('Giao dịch kho')).toBeInTheDocument()
    expect(screen.getAllByText('Laptop A').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByPlaceholderText('Tìm theo tên sản phẩm, tham chiếu, người thao tác...'), {
      target: { value: 'Laptop' },
    })
    await screen.findByRole('option', { name: 'Laptop' })
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'IMPORT' } })
    fireEvent.change(selects[1], { target: { value: 'Laptop' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lọc' }))

    await waitFor(() => {
      expect(inventoryService.getInventoryTransactions).toHaveBeenCalled()
    })

    const lastCallArgs = inventoryService.getInventoryTransactions.mock.calls.at(-1)[0]
    expect(lastCallArgs.type).toBe('IMPORT')
    expect(lastCallArgs.category).toBe('Laptop')
    expect(lastCallArgs.keyword).toBe('Laptop')
  })
})
