import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminExports from '../AdminExports'
import AdminImports from '../AdminImports'

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
  createInventoryImport: vi.fn(),
  createInventoryExport: vi.fn(),
  getInventoryImports: vi.fn(),
  getInventoryExports: vi.fn(),
}))

vi.mock('../../../utils/timing', () => ({
  withMinimumDelay: (value) => value,
}))

const productService = await import('../../../services/productService')
const inventoryService = await import('../../../services/inventoryService')

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Admin inventory forms', () => {
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
        brand: 'Nexora',
        price: 20000000,
        stock: 5,
      },
      {
        id: 'p2',
        name: 'Mouse B',
        category: 'Phu kien',
        brand: 'Nexora',
        price: 500000,
        stock: 0,
      },
    ])

    inventoryService.getInventoryImports.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    inventoryService.getInventoryExports.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    inventoryService.createInventoryImport.mockResolvedValue({
      receipt: { supplierName: 'NCC test' },
    })

    inventoryService.createInventoryExport.mockResolvedValue({
      receipt: { reason: 'MANUAL' },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows confirmation modal and submits import receipt', async () => {
    renderWithRouter(<AdminImports />)

    expect(await screen.findByText('Phiếu nhập')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Thêm' })[0])
    fireEvent.change(screen.getByLabelText('Nhà cung cấp'), { target: { value: 'NCC test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nhập kho' }))

    expect(await screen.findByText('Xác nhận phiếu nhập')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() => {
      expect(inventoryService.createInventoryImport).toHaveBeenCalled()
    })

    expect(inventoryService.createInventoryImport.mock.calls[0][0].status).toBe('CONFIRMED')
  })

  it('validates export stock before confirmation', async () => {
    renderWithRouter(<AdminExports />)

    expect(await screen.findByText('Phiếu xuất')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Thêm' })[0])

    fireEvent.change(screen.getByLabelText('Số lượng'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xuất kho' }))

    expect(toastSpy).toHaveBeenCalled()
    expect(toastSpy.mock.calls[0][0].title).toBe('Phiếu xuất không hợp lệ')
  })
})
