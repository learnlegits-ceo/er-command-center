import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useUser, UserRole } from '@/contexts/UserContext'
import { Eye, EyeOff, Building2, Mail, Lock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { endpoints } from '@/lib/api'
import { getDefaultAvatar } from '@/lib/utils'

export default function Login() {
  const navigate = useNavigate()
  const { user, setUser, isAuthLoading } = useUser()

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, isAuthLoading, navigate])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Call backend API
      const response = await endpoints.auth.login({ email, password })

      if (response.data.success) {
        const { user, token, refreshToken } = response.data.data

        // Store tokens
        localStorage.setItem('authToken', token)
        localStorage.setItem('refreshToken', refreshToken)

        // Set user in context
        setUser({
          id: user.id,
          name: user.name,
          role: user.role as UserRole,
          avatar: user.avatar || getDefaultAvatar(user.name, user.role),
          department: user.department || 'General'
        })

        // Navigate to dashboard
        navigate('/dashboard')
      } else {
        setError('Invalid email or password')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 'Login failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Healthcare Portal</h1>
          <p className="text-muted-foreground mt-2">Sign in to access the system</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-card rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Demo Credentials (requires demo data loaded):</p>
          <p className="text-xs text-muted-foreground mb-3">Make sure to run demo_health.sql to create these users</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Role</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Email</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Password</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 text-foreground">Nurse</td>
                <td className="py-2 text-foreground font-mono text-xs">priya@hospital.com</td>
                <td className="py-2 text-foreground font-mono text-xs">nurse123</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 text-foreground">Doctor</td>
                <td className="py-2 text-foreground font-mono text-xs">ananya@hospital.com</td>
                <td className="py-2 text-foreground font-mono text-xs">doctor123</td>
              </tr>
              <tr>
                <td className="py-2 text-foreground">Admin</td>
                <td className="py-2 text-foreground font-mono text-xs">rajesh@hospital.com</td>
                <td className="py-2 text-foreground font-mono text-xs">admin123</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2024 Healthcare Portal. All rights reserved.
        </p>
      </div>
    </div>
  )
}
