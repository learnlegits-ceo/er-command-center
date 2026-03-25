import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor — auto-refresh token on 401
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token)
    } else {
      prom.reject(error)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthRequest = originalRequest?.url?.includes('/auth/')
    const isOnLoginPage = window.location.pathname === '/login'

    // Attempt token refresh on 401 (not for auth routes, not already retried)
    if (error.response?.status === 401 && !isAuthRequest && !isOnLoginPage && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken) {
        if (isRefreshing) {
          // Queue this request while refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const response = await api.post('/auth/refresh-token', { refresh_token: refreshToken })
          const newToken = response.data.token
          const newRefreshToken = response.data.refresh_token

          localStorage.setItem('authToken', newToken)
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken)
          }

          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          localStorage.removeItem('authToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('currentUser')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // No refresh token — redirect to login
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const endpoints = {
  // Patient endpoints
  patients: {
    getAll: (params?: { status?: string; department?: string }) => api.get('/patients', { params }),
    getById: (id: string) => api.get(`/patients/${id}`),
    create: (data: any) => api.post('/patients', data),
    update: (id: string, data: any) => api.put(`/patients/${id}`, data),
    delete: (id: string) => api.delete(`/patients/${id}`),
    triage: (id: string) => api.post(`/patients/${id}/triage`),
    batchTriage: () => api.post('/patients/batch-triage'),
    // Vitals
    getVitals: (id: string) => api.get(`/patients/${id}/vitals`),
    addVitals: (id: string, vitals: any) => api.post(`/patients/${id}/vitals`, vitals),
    // Triage Timeline
    getTriageTimeline: (id: string) => api.get(`/patients/${id}/triage-timeline`),
    recommendTriageShift: (id: string, context: any) => api.post(`/patients/${id}/recommend-triage-shift`, context),
    shiftTriage: (id: string, data: any) => api.post(`/patients/${id}/shift-triage`, data),
    transferToOPD: (id: string) => api.post(`/patients/${id}/transfer-to-opd`),
    discharge: (id: string, data: any) => api.post(`/patients/${id}/discharge`, data),
    // Prescriptions
    createPrescription: (id: string, data: any) => api.post(`/patients/${id}/prescriptions`, data),
    getPrescriptions: (id: string) => api.get(`/patients/${id}/prescriptions`),
    searchMedications: (query: string = '') => api.get('/patients/medications/search', { params: { query, limit: 300 } }),
    uploadPhoto: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/patients/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    // Notes
    getNotes: (id: string, type?: string) => api.get(`/patients/${id}/notes`, { params: { type: type || 'all' } }),
    createNote: (id: string, data: { type: string; content: string; is_confidential?: boolean }) => api.post(`/patients/${id}/notes`, data),
  },

  // Bed endpoints
  beds: {
    getAll: (params?: { department?: string }) => api.get('/beds', { params }),
    getById: (id: string) => api.get(`/beds/${id}`),
    updateStatus: (id: string, status: string) => api.patch(`/beds/${id}/status`, { status }),
    assign: (id: string, patientId: string) => api.post(`/beds/${id}/assign`, { patientId }),
    release: (id: string) => api.post(`/beds/${id}/release`),
  },

  // Staff endpoints
  staff: {
    getAll: () => api.get('/staff'),
    getById: (id: string) => api.get(`/staff/${id}`),
    getAvailable: () => api.get('/staff/available'),
    updateStatus: (id: string, status: string) => api.patch(`/staff/${id}/status`, { status }),
  },

  // Department endpoints
  departments: {
    getAll: () => api.get('/departments'),
    getDoctors: (departmentId: string) => api.get(`/departments/${departmentId}/doctors`),
    getBeds: (departmentId: string, status?: string) => api.get(`/departments/${departmentId}/beds`, { params: { status: status || 'available' } }),
  },

  // Emergency alerts
  alerts: {
    getAll: () => api.get('/alerts'),
    getActive: () => api.get('/alerts/active'),
    create: (data: any) => api.post('/alerts', data),
    markRead: (id: string) => api.put(`/alerts/${id}/read`, {}),
    acknowledge: (id: string) => api.put(`/alerts/${id}/acknowledge`, {}),
    resolve: (id: string) => api.put(`/alerts/${id}/resolve`, { resolution: 'Resolved' }),
    dismiss: (id: string) => api.delete(`/alerts/${id}`),
    seed: () => api.post('/alerts/seed'),
  },

  // Police Cases
  policeCases: {
    create: (data: { patient_id: string; patient_name: string; case_type: string; description?: string; complaint?: string }) =>
      api.post('/police-cases', data),
    getAll: (params?: { status?: string; case_type?: string }) => api.get('/police-cases', { params }),
    contactPolice: (caseId: string, data: any) => api.put(`/police-cases/${caseId}/contact-police`, data),
    resolve: (caseId: string, data: { resolution: string; fir_number?: string }) => api.put(`/police-cases/${caseId}/resolve`, data),
  },

  // Resources
  resources: {
    getAll: () => api.get('/resources'),
    getByType: (type: string) => api.get(`/resources/type/${type}`),
    updateQuantity: (id: string, quantity: number) => api.patch(`/resources/${id}/quantity`, { quantity }),
  },

  // Dashboard statistics
  dashboard: {
    getStats: () => api.get('/dashboard/stats'),
    getOccupancy: () => api.get('/dashboard/occupancy'),
    getPatientFlow: () => api.get('/dashboard/patient-flow'),
  },

  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: () => api.get('/auth/me'),
    forgotPassword: (data: { email: string }) => api.post('/auth/forgot-password', data),
    verifyOTP: (data: { email: string; otp: string }) => api.post('/auth/verify-otp', data),
    resetPassword: (data: { reset_token: string; new_password: string }) => api.post('/auth/reset-password', data),
    changePassword: (data: { current_password: string; new_password: string }) => api.post('/auth/change-password', data),
    refreshToken: (refreshToken: string) => api.post('/auth/refresh-token', { refresh_token: refreshToken }),
  },

  // Admin endpoints
  admin: {
    getStaff: (params?: { role?: string; status?: string; search?: string }) =>
      api.get('/admin/staff', { params }),
    createStaff: (data: {
      name: string
      email: string
      password: string
      role: string
      department_id?: string
      phone?: string
      specialization?: string
      avatar_url?: string
    }) => api.post('/admin/staff', data),
    updateStaff: (id: string, data: {
      name?: string
      phone?: string
      department_id?: string
      specialization?: string
      status?: string
      avatar_url?: string
    }) => api.put(`/admin/staff/${id}`, data),
    deleteStaff: (id: string) => api.delete(`/admin/staff/${id}`),
    resetPassword: (id: string) => api.post(`/admin/staff/${id}/reset-password`),
    getAuditLogs: (params?: { limit?: number; offset?: number; action?: string; entity_type?: string }) =>
      api.get('/admin/audit-logs', { params }),
    // Bed pricing
    getBedPricing: () => api.get('/admin/bed-pricing'),
    setBedPricing: (data: { bed_type: string; cost_per_day: number; currency?: string }) =>
      api.post('/admin/bed-pricing', data),
    updateBedPricing: (id: string, data: { cost_per_day?: number; is_active?: boolean }) =>
      api.put(`/admin/bed-pricing/${id}`, data),
    deleteBedPricing: (id: string) => api.delete(`/admin/bed-pricing/${id}`),
    // Usage
    getUsage: () => api.get('/admin/usage'),
    getUsageHistory: () => api.get('/admin/usage/history'),
  },

  // Hospital billing
  billing: {
    getCurrent: () => api.get('/billing/current'),
    getInvoices: () => api.get('/billing/invoices'),
    getInvoiceDetail: (id: string) => api.get(`/billing/invoices/${id}`),
  },

  // Platform admin
  platform: {
    getDashboard: () => api.get('/platform/dashboard'),
    // Hospitals
    getHospitals: (params?: { search?: string; plan?: string; status?: string }) =>
      api.get('/platform/hospitals', { params }),
    getHospital: (id: string) => api.get(`/platform/hospitals/${id}`),
    createHospital: (data: any) => api.post('/platform/hospitals', data),
    updateHospital: (id: string, data: any) => api.put(`/platform/hospitals/${id}`, data),
    updateHospitalStatus: (id: string, status: string) =>
      api.patch(`/platform/hospitals/${id}/status`, { status }),
    deleteHospital: (id: string) => api.delete(`/platform/hospitals/${id}`),
    // Plans
    getPlans: () => api.get('/platform/plans'),
    createPlan: (data: any) => api.post('/platform/plans', data),
    updatePlan: (id: string, data: any) => api.put(`/platform/plans/${id}`, data),
    deletePlan: (id: string) => api.delete(`/platform/plans/${id}`),
    // Team
    getTeam: () => api.get('/platform/team'),
    inviteTeamMember: (params: { name: string; email: string; password: string }) =>
      api.post('/platform/team', null, { params }),
    removeTeamMember: (id: string) => api.delete(`/platform/team/${id}`),
    // Billing
    getBillingOverview: () => api.get('/platform/billing/overview'),
    getHospitalInvoices: (hospitalId: string) => api.get(`/platform/hospitals/${hospitalId}/invoices`),
    generateInvoices: () => api.post('/platform/billing/generate-invoices'),
    markInvoicePaid: (hospitalId: string, invoiceId: string) =>
      api.post(`/platform/hospitals/${hospitalId}/invoices/${invoiceId}/mark-paid`),
    getHospitalUsage: (hospitalId: string) => api.get(`/platform/hospitals/${hospitalId}/usage`),
  },
}

export default api
