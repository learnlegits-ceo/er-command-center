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

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for auth-related requests or if already on login page
    const isAuthRequest = error.config?.url?.includes('/auth/')
    const isOnLoginPage = window.location.pathname === '/login'

    if (error.response?.status === 401 && !isAuthRequest && !isOnLoginPage) {
      // Handle unauthorized access - clear tokens and redirect to login
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
  },
}

export default api
