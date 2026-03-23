import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must use vi.hoisted for variables used inside vi.mock
const { mockGet, mockPost, mockPut, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      patch: mockPatch,
      delete: mockDelete,
      defaults: { baseURL: 'http://test' },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
  },
}))

import { endpoints } from '../api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Platform API endpoints', () => {
  describe('platform.getDashboard', () => {
    it('calls GET /platform/dashboard', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true } })
      await endpoints.platform.getDashboard()
      expect(mockGet).toHaveBeenCalledWith('/platform/dashboard')
    })
  })

  describe('platform.getHospitals', () => {
    it('calls GET /platform/hospitals with params', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } })
      await endpoints.platform.getHospitals({ search: 'apollo', plan: 'starter' })
      expect(mockGet).toHaveBeenCalledWith('/platform/hospitals', {
        params: { search: 'apollo', plan: 'starter' },
      })
    })

    it('calls without params', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } })
      await endpoints.platform.getHospitals()
      expect(mockGet).toHaveBeenCalledWith('/platform/hospitals', { params: undefined })
    })
  })

  describe('platform.createHospital', () => {
    it('calls POST /platform/hospitals', async () => {
      const data = { name: 'Test', code: 'T001', plan_id: 'uuid', initial_admin: { name: 'A', email: 'a@t.com', password: 'P@ss1234' } }
      mockPost.mockResolvedValueOnce({ data: { success: true } })
      await endpoints.platform.createHospital(data)
      expect(mockPost).toHaveBeenCalledWith('/platform/hospitals', data)
    })
  })

  describe('platform.updateHospitalStatus', () => {
    it('calls PATCH with status', async () => {
      mockPatch.mockResolvedValueOnce({ data: { success: true } })
      await endpoints.platform.updateHospitalStatus('id-123', 'suspended')
      expect(mockPatch).toHaveBeenCalledWith('/platform/hospitals/id-123/status', { status: 'suspended' })
    })
  })

  describe('platform.getPlans', () => {
    it('calls GET /platform/plans', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } })
      await endpoints.platform.getPlans()
      expect(mockGet).toHaveBeenCalledWith('/platform/plans')
    })
  })

  describe('platform.createPlan', () => {
    it('calls POST /platform/plans', async () => {
      const data = { name: 'New', code: 'new', base_price: 9999 }
      mockPost.mockResolvedValueOnce({ data: { success: true } })
      await endpoints.platform.createPlan(data)
      expect(mockPost).toHaveBeenCalledWith('/platform/plans', data)
    })
  })

  describe('platform.getTeam', () => {
    it('calls GET /platform/team', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } })
      await endpoints.platform.getTeam()
      expect(mockGet).toHaveBeenCalledWith('/platform/team')
    })
  })

  describe('platform.generateInvoices', () => {
    it('calls POST /platform/billing/generate-invoices', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } })
      await endpoints.platform.generateInvoices()
      expect(mockPost).toHaveBeenCalledWith('/platform/billing/generate-invoices')
    })
  })

  describe('platform.markInvoicePaid', () => {
    it('calls POST with correct path', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } })
      await endpoints.platform.markInvoicePaid('hosp-1', 'inv-1')
      expect(mockPost).toHaveBeenCalledWith('/platform/hospitals/hosp-1/invoices/inv-1/mark-paid')
    })
  })
})

describe('Billing API endpoints', () => {
  it('getCurrent calls GET /billing/current', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true } })
    await endpoints.billing.getCurrent()
    expect(mockGet).toHaveBeenCalledWith('/billing/current')
  })

  it('getInvoices calls GET /billing/invoices', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } })
    await endpoints.billing.getInvoices()
    expect(mockGet).toHaveBeenCalledWith('/billing/invoices')
  })

  it('getInvoiceDetail calls GET with id', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true } })
    await endpoints.billing.getInvoiceDetail('inv-123')
    expect(mockGet).toHaveBeenCalledWith('/billing/invoices/inv-123')
  })
})

describe('Admin bed pricing API endpoints', () => {
  it('getBedPricing calls GET /admin/bed-pricing', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } })
    await endpoints.admin.getBedPricing()
    expect(mockGet).toHaveBeenCalledWith('/admin/bed-pricing')
  })

  it('setBedPricing calls POST /admin/bed-pricing', async () => {
    const data = { bed_type: 'icu', cost_per_day: 5000 }
    mockPost.mockResolvedValueOnce({ data: { success: true } })
    await endpoints.admin.setBedPricing(data)
    expect(mockPost).toHaveBeenCalledWith('/admin/bed-pricing', data)
  })

  it('updateBedPricing calls PUT with id', async () => {
    mockPut.mockResolvedValueOnce({ data: { success: true } })
    await endpoints.admin.updateBedPricing('bp-1', { cost_per_day: 6000 })
    expect(mockPut).toHaveBeenCalledWith('/admin/bed-pricing/bp-1', { cost_per_day: 6000 })
  })

  it('deleteBedPricing calls DELETE with id', async () => {
    mockDelete.mockResolvedValueOnce({ data: { success: true } })
    await endpoints.admin.deleteBedPricing('bp-1')
    expect(mockDelete).toHaveBeenCalledWith('/admin/bed-pricing/bp-1')
  })

  it('getUsage calls GET /admin/usage', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true } })
    await endpoints.admin.getUsage()
    expect(mockGet).toHaveBeenCalledWith('/admin/usage')
  })

  it('getUsageHistory calls GET /admin/usage/history', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } })
    await endpoints.admin.getUsageHistory()
    expect(mockGet).toHaveBeenCalledWith('/admin/usage/history')
  })
})
