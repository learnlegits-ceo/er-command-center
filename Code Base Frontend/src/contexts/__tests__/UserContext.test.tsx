import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'

// Mock the api module to prevent real API calls
vi.mock('@/lib/api', () => ({
  endpoints: {
    auth: {
      getCurrentUser: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'mock-id',
            name: 'Mock User',
            role: 'nurse',
            avatar: null,
            department: 'ED',
          },
        },
      }),
    },
  },
  api: {
    defaults: { baseURL: 'http://test' },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Import AFTER mocks are set up
import { UserProvider, useUser, User } from '../UserContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserProvider>{children}</UserProvider>
)

function setupUserInStorage(user: User) {
  localStorageMock.setItem('currentUser', JSON.stringify(user))
  localStorageMock.setItem('authToken', 'fake-token')
  localStorageMock.setItem('refreshToken', 'fake-refresh')
}

describe('UserContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('restores user from localStorage on mount', async () => {
    setupUserInStorage({
      id: '1', name: 'Test Nurse', role: 'nurse', avatar: '/avatar.png',
    })

    const { result } = renderHook(() => useUser(), { wrapper })

    // Initial state from localStorage (synchronous)
    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })
    expect(result.current.user?.name).toBeTruthy()
  })

  it('computes nurse permissions correctly', async () => {
    setupUserInStorage({
      id: '1', name: 'Test Nurse', role: 'nurse', avatar: '/avatar.png',
    })

    const { result } = renderHook(() => useUser(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })

    expect(result.current.canRegisterPatients).toBe(true)
    expect(result.current.canAddNurseNotes).toBe(true)
    expect(result.current.canPrescribe).toBe(false)
    expect(result.current.canManageUsers).toBe(false)
    expect(result.current.canAccessAdmin).toBe(false)
    expect(result.current.canDischarge).toBe(true)
  })

  it('computes doctor permissions correctly', async () => {
    setupUserInStorage({
      id: '2', name: 'Test Doctor', role: 'doctor', avatar: '/avatar.png',
    })

    // Override the mock to return a doctor
    const { endpoints } = await import('@/lib/api')
    vi.mocked(endpoints.auth.getCurrentUser).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: '2', name: 'Test Doctor', role: 'doctor', avatar: null, department: 'ED' },
      },
    } as any)

    const { result } = renderHook(() => useUser(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })

    expect(result.current.canPrescribe).toBe(true)
    expect(result.current.canDischarge).toBe(true)
    expect(result.current.canAddDoctorComments).toBe(true)
    expect(result.current.canRegisterPatients).toBe(false)
    expect(result.current.canManageUsers).toBe(false)
  })

  it('computes admin permissions correctly', async () => {
    setupUserInStorage({
      id: '3', name: 'Test Admin', role: 'admin', avatar: '/avatar.png',
    })

    const { endpoints } = await import('@/lib/api')
    vi.mocked(endpoints.auth.getCurrentUser).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: '3', name: 'Test Admin', role: 'admin', avatar: null, department: 'ED' },
      },
    } as any)

    const { result } = renderHook(() => useUser(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })

    expect(result.current.canManageUsers).toBe(true)
    expect(result.current.canAccessAdmin).toBe(true)
    expect(result.current.canRegisterPatients).toBe(true)
    expect(result.current.canPrescribe).toBe(true)
    expect(result.current.canDischarge).toBe(true)
  })

  it('clears tokens on logout (setUser null)', async () => {
    setupUserInStorage({
      id: '1', name: 'Test', role: 'nurse', avatar: '/a.png',
    })

    const { result } = renderHook(() => useUser(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    })

    act(() => {
      result.current.setUser(null)
    })

    expect(result.current.user).toBeNull()
    expect(localStorageMock.getItem('authToken')).toBeNull()
    expect(localStorageMock.getItem('refreshToken')).toBeNull()
    expect(localStorageMock.getItem('currentUser')).toBeNull()
  })
})
