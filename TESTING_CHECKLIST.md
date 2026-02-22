# ER Command Center - Testing Checklist

This document provides a comprehensive checklist for testing the Healthcare Management System after setup.

---

## Prerequisites

Before testing, ensure:
- ✅ All services are running (use `verify.bat` or `verify.sh`)
- ✅ Backend API is accessible at http://localhost:8000
- ✅ Frontend is accessible at http://localhost:5173
- ✅ Database is initialized with demo data

---

## 1. Service Health Checks

### Backend Health
```bash
curl http://localhost:8000/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "app": "ER Command Center",
  "version": "1.0.0"
}
```

### API Documentation
- Visit: http://localhost:8000/api/docs
- ✅ Swagger UI should load
- ✅ All endpoints should be visible
- ✅ Try the "Try it out" feature on `/health` endpoint

### Frontend Loading
- Visit: http://localhost:5173
- ✅ Login page should display
- ✅ No console errors in browser DevTools
- ✅ Demo credentials table should be visible

---

## 2. Authentication Flow

### Test Case 1: Login with Nurse Account
1. Email: `priya@hospital.com`
2. Password: `nurse123`
3. Click "Sign In"

**Expected Results:**
- ✅ Loading state shows briefly
- ✅ Redirects to `/dashboard`
- ✅ User name appears in header
- ✅ Token stored in localStorage
- ✅ No console errors

**Verification:**
```javascript
// In browser console
localStorage.getItem('authToken')  // Should return JWT token
localStorage.getItem('refreshToken')  // Should return refresh token
```

### Test Case 2: Login with Invalid Credentials
1. Email: `invalid@hospital.com`
2. Password: `wrongpassword`
3. Click "Sign In"

**Expected Results:**
- ✅ Error message displays: "Invalid email or password"
- ✅ User remains on login page
- ✅ Form fields remain populated

### Test Case 3: Login with Different Roles
Repeat Test Case 1 with:
- Doctor: `ananya@hospital.com` / `doctor123`
- Admin: `rajesh@hospital.com` / `admin123`

**Expected Results:**
- ✅ Each role logs in successfully
- ✅ Dashboard shows appropriate permissions
- ✅ Different navigation options may appear based on role

### Test Case 4: Logout
1. Click user avatar/menu in header
2. Click "Logout"

**Expected Results:**
- ✅ Redirects to `/login`
- ✅ localStorage tokens are cleared
- ✅ Cannot access protected routes without re-login

---

## 3. Dashboard Functionality

### Test Case 5: Dashboard Data Loading
1. Login with any demo account
2. Observe dashboard loading

**Expected Results:**
- ✅ Loading spinner displays briefly
- ✅ Dashboard stats load (patient counts, bed stats)
- ✅ Triage queue displays active patients
- ✅ Capacity stats show bed availability
- ✅ Alerts section shows recent alerts
- ✅ Analytics charts render correctly
- ✅ All numbers should be from real database (not hardcoded)

**Check Network Tab:**
- ✅ API calls to `/dashboard/stats`
- ✅ API calls to `/patients?status=active`
- ✅ API calls to `/alerts?status=unread`
- ✅ All return 200 status codes

### Test Case 6: New Patient Arrival
1. Click "New Arrival" button on dashboard
2. Fill in patient details:
   - Name: "Test Patient"
   - Age: 35
   - Gender: Select "Male"
   - Phone: "+91 9876543210"
   - Complaint: "Chest pain"
   - Fill vitals (HR, BP, SpO2, Temp, RR)
3. Click "Register Patient"

**Expected Results:**
- ✅ Loading state during submission
- ✅ Success message appears
- ✅ Modal closes
- ✅ New patient appears in triage queue
- ✅ Patient has been assigned priority
- ✅ Form resets for next entry

**Verification:**
- Check database: Patient should exist with status `pending_triage`
- Check API logs: POST to `/patients` succeeded

### Test Case 7: Patient Detail Modal
1. Click on any patient card in triage queue
2. Patient detail modal opens

**Expected Results:**
- ✅ Modal displays patient information
- ✅ Vitals are shown with proper formatting
- ✅ Medical history visible (if any)
- ✅ Assigned staff shown (if assigned)
- ✅ Bed information shown (if assigned)
- ✅ Action buttons are functional

---

## 4. Patient Management

### Test Case 8: View All Patients
1. Navigate to "Patients" page from sidebar
2. Wait for patients to load

**Expected Results:**
- ✅ Patient list displays in grid format
- ✅ Each patient card shows:
  - Patient ID
  - Name, Age, Gender
  - Complaint
  - Priority badge with correct color
  - Status badge
  - Vitals (if available)
  - Bed assignment (if any)
  - Department (if assigned)
- ✅ Search bar is functional
- ✅ Filter buttons work

### Test Case 9: Search Patients
1. On Patients page, type in search box:
   - Search by name: "Test"
   - Search by Patient ID: "P00001"

**Expected Results:**
- ✅ Results filter in real-time
- ✅ Matching patients are shown
- ✅ Non-matching patients are hidden
- ✅ Search is case-insensitive

### Test Case 10: Filter Patients by Status
1. Click "Active" filter button
2. Click "Admitted" filter button
3. Click "Pending" filter button
4. Click "All" filter button

**Expected Results:**
- ✅ Only patients with selected status are shown
- ✅ Active filter button is highlighted
- ✅ Patient count updates accordingly
- ✅ Switching filters updates list correctly

### Test Case 11: Filter Patients by Priority
1. Click "Critical" priority filter
2. Click "Urgent" priority filter
3. Click other priority filters

**Expected Results:**
- ✅ Only patients with selected priority shown
- ✅ Filter works independently of status filter
- ✅ Combined filters work correctly
- ✅ "All" clears the filter

---

## 5. Bed Management

### Test Case 12: View All Beds
1. Navigate to "Beds" page from sidebar
2. Wait for beds to load

**Expected Results:**
- ✅ Bed stats show at top:
  - Total Beds
  - Available (green)
  - Occupied (orange)
  - Maintenance (gray)
- ✅ Bed cards display in grid
- ✅ Each bed shows:
  - Bed number
  - Bed type (ICU, General, etc.)
  - Status with color coding
  - Floor/Ward information
  - Patient info (if occupied)
  - Last cleaned timestamp
- ✅ Filter by type works (ICU, General, etc.)
- ✅ Filter by status works (Available, Occupied, etc.)

### Test Case 13: Filter Beds
1. Click "ICU" type filter
2. Click "Available" status filter
3. Clear filters

**Expected Results:**
- ✅ Filters apply correctly
- ✅ Stats update based on filtered view
- ✅ Multiple filters work together
- ✅ Bed count is accurate

### Test Case 14: Bed Actions (if implemented)
1. Click on an available bed
2. Try to assign to a patient
3. Try to change bed status

**Expected Results:**
- ✅ Actions execute successfully
- ✅ Bed status updates in real-time
- ✅ API calls complete without errors

---

## 6. Alerts System

### Test Case 15: View Alerts
1. Navigate to "Alerts" page from sidebar
2. Wait for alerts to load

**Expected Results:**
- ✅ Alert stats show at top:
  - Total Alerts
  - Unread count
  - Critical count
- ✅ Alert list displays with:
  - Priority color coding (Critical=red, High=orange, Medium=yellow, Low=blue)
  - Title and message
  - Category
  - Patient information (if related)
  - Timestamp (relative time)
  - Status badge
- ✅ Alerts are sorted by newest first

### Test Case 16: Acknowledge Alert
1. Find an unread alert
2. Click "Acknowledge" button

**Expected Results:**
- ✅ Button shows loading state
- ✅ Alert status changes to "Acknowledged"
- ✅ Status badge updates
- ✅ Acknowledged timestamp appears
- ✅ Alert moves to acknowledged section (if separated)

### Test Case 17: Resolve Alert
1. Find an acknowledged alert
2. Click "Resolve" button

**Expected Results:**
- ✅ Button shows loading state
- ✅ Alert status changes to "Resolved"
- ✅ Status badge updates to green
- ✅ Resolved timestamp appears
- ✅ Alert may move to resolved section

---

## 7. Additional Features

### Test Case 18: Forgot Password Flow
1. On login page, click "Forgot Password?"
2. Enter email: `priya@hospital.com`
3. Click "Send OTP"

**Expected Results:**
- ✅ Success message appears
- ✅ OTP is sent (check console logs or email)
- ✅ Redirects to OTP verification page
- ✅ OTP expiry time is shown

**Note:** Check backend logs for OTP if email is not configured:
```bash
cd "Code Base Backend"
docker-compose logs backend | grep "OTP"
```

### Test Case 19: Navigation
1. Test all sidebar navigation links:
   - Dashboard
   - Emergency Department (with sub-units)
   - OPD
   - Patients
   - Beds
   - Alerts
   - Profile
   - Settings
   - Admin (if admin role)

**Expected Results:**
- ✅ All links navigate correctly
- ✅ Active page is highlighted in sidebar
- ✅ Page titles update
- ✅ Breadcrumbs update (if implemented)
- ✅ Protected routes require authentication

### Test Case 20: Responsive Design
1. Resize browser window to different sizes
2. Test on mobile view (DevTools → Device Toolbar)

**Expected Results:**
- ✅ Layout adjusts for smaller screens
- ✅ Sidebar collapses to hamburger menu
- ✅ Grid layouts stack vertically on mobile
- ✅ Buttons remain accessible
- ✅ No horizontal scrolling
- ✅ Touch targets are large enough

---

## 8. API Integration Tests

### Test Case 21: Direct API Testing (Swagger)
1. Visit http://localhost:8000/api/docs
2. Try the following endpoints:
   - GET `/patients` - List all patients
   - GET `/beds` - List all beds
   - GET `/dashboard/stats` - Dashboard statistics
   - GET `/alerts` - List alerts

**Expected Results:**
- ✅ All endpoints return 200 OK
- ✅ Response data matches expected schema
- ✅ Pagination works (where applicable)
- ✅ Filters work as documented

### Test Case 22: Authentication Headers
1. Login to frontend
2. Open browser DevTools → Network tab
3. Make some actions (view patients, beds, etc.)
4. Check request headers

**Expected Results:**
- ✅ All API requests include `Authorization: Bearer <token>`
- ✅ Token is valid JWT format
- ✅ Unauthorized requests (401) redirect to login
- ✅ Token refresh works when expired

---

## 9. Error Handling

### Test Case 23: Network Errors
1. Stop backend: `docker-compose down backend`
2. Try to perform actions in frontend

**Expected Results:**
- ✅ Error messages display clearly
- ✅ No application crashes
- ✅ Retry mechanism works (if implemented)
- ✅ User is informed about connectivity issues

### Test Case 24: Invalid Data
1. Try to create patient with:
   - Empty required fields
   - Invalid age (negative, too large)
   - Invalid phone format

**Expected Results:**
- ✅ Form validation prevents submission
- ✅ Error messages show for each field
- ✅ Submit button disabled until valid

---

## 10. Performance Tests

### Test Case 25: Page Load Times
1. Open browser DevTools → Performance tab
2. Record page load for each route

**Expected Results:**
- ✅ Initial load < 3 seconds
- ✅ Route changes < 1 second
- ✅ API responses < 500ms (local)
- ✅ No memory leaks after navigation

### Test Case 26: Large Data Sets
1. Add multiple patients (10+)
2. Test pagination, filtering, search

**Expected Results:**
- ✅ Performance remains smooth
- ✅ Pagination works correctly
- ✅ Search is responsive
- ✅ No lag in UI interactions

---

## 11. Data Persistence

### Test Case 27: Data Survival After Restart
1. Add a new patient
2. Restart backend: `docker-compose restart backend`
3. Refresh frontend

**Expected Results:**
- ✅ New patient still exists
- ✅ All data persists correctly
- ✅ No data loss

### Test Case 28: Session Persistence
1. Login
2. Close browser tab
3. Reopen http://localhost:5173

**Expected Results:**
- ✅ User remains logged in (if token valid)
- ✅ Or redirects to login if token expired
- ✅ Token refresh works automatically

---

## 12. Security Tests

### Test Case 29: Protected Routes
1. Without logging in, try to access:
   - http://localhost:5173/dashboard
   - http://localhost:5173/patients
   - http://localhost:5173/beds

**Expected Results:**
- ✅ Redirects to `/login` for all protected routes
- ✅ Cannot access API endpoints without token
- ✅ 401 Unauthorized errors handled gracefully

### Test Case 30: Token Expiration
1. Login
2. Wait for token to expire (or manually expire in backend)
3. Try to perform an action

**Expected Results:**
- ✅ API returns 401 Unauthorized
- ✅ User redirected to login
- ✅ localStorage tokens cleared
- ✅ Refresh token attempted before logout (if implemented)

---

## Test Results Summary

### Priority 1 (Critical) - Must Pass
- [ ] Login/Logout works
- [ ] Dashboard loads with real data
- [ ] Patient registration works
- [ ] All navigation links work
- [ ] API returns correct data
- [ ] No console errors on any page

### Priority 2 (High) - Should Pass
- [ ] Search and filters work
- [ ] Bed management displays correctly
- [ ] Alerts system functional
- [ ] Error handling works
- [ ] Responsive design works
- [ ] Token refresh works

### Priority 3 (Medium) - Nice to Have
- [ ] Forgot password flow works
- [ ] Email notifications work (if configured)
- [ ] Real-time updates work
- [ ] Performance is optimal
- [ ] All edge cases handled

---

## Known Limitations

### Current State
1. **AI Triage**: Requires Groq API key, works in mock mode without it
2. **Email Notifications**: Requires Resend API key, logs to console otherwise
3. **Push Notifications**: Framework exists but Firebase/OneSignal not integrated
4. **Real-time Updates**: Uses polling (30s), no WebSocket implementation
5. **File Uploads**: S3 configured but upload flow may be incomplete

### Demo Data
- Database includes 3 demo users (Nurse, Doctor, Admin)
- May include sample patients, beds, and alerts
- Data resets when database volume is removed

---

## Troubleshooting Common Issues

### Issue: "Cannot connect to backend"
**Solution:**
```bash
cd "Code Base Backend"
docker-compose logs backend
# Check for errors, ensure database is ready
```

### Issue: "Login fails with 401"
**Solution:**
- Check backend logs for errors
- Verify demo data is loaded: `docker exec -it er_postgres psql -U postgres -d demo_health -c "SELECT * FROM users;"`
- Password hash may be incorrect in database

### Issue: "Dashboard shows no data"
**Solution:**
- Check Network tab for API responses
- Verify token is in request headers
- Check if demo data is loaded
- Try creating new patient manually

### Issue: "TypeScript errors in frontend"
**Solution:**
```bash
cd "Code Base Frontend"
npm install  # Reinstall dependencies
npm run build  # Check for build errors
```

---

## Reporting Issues

When reporting issues, please include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Screenshots/screen recordings
4. Browser console errors
5. Backend logs (if applicable)
6. Environment (OS, browser, Docker version)

---

## Next Steps After Testing

Once all critical tests pass:
1. ✅ Review the codebase
2. ✅ Add more demo data if needed
3. ✅ Configure external services (Groq, Resend, etc.)
4. ✅ Customize branding and styling
5. ✅ Set up production environment
6. ✅ Configure CI/CD pipeline
7. ✅ Set up monitoring and logging

---

**Happy Testing! 🚀**

For setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)
