import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../api'

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

describe('API Client', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('injects auth token from localStorage into requests', async () => {
    localStorageMock.setItem('authToken', 'test-jwt-token')

    // Intercept the request to check headers
    const interceptor = api.interceptors.request.handlers[0]
    const config = { headers: {} as Record<string, string> }
    const result = interceptor.fulfilled(config)

    expect(result.headers.Authorization).toBe('Bearer test-jwt-token')
  })

  it('does not inject token when none is stored', async () => {
    const interceptor = api.interceptors.request.handlers[0]
    const config = { headers: {} as Record<string, string> }
    const result = interceptor.fulfilled(config)

    expect(result.headers.Authorization).toBeUndefined()
  })

  it('has correct base URL configured', () => {
    // In test env, should fall back to default
    expect(api.defaults.baseURL).toBeDefined()
  })
})
