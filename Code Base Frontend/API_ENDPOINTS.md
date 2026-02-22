# Healthcare Portal - Backend API Endpoints

Base URL: `/api/v1`

---

## 1. Authentication

### POST `/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "priya@hospital.com",
  "password": "nurse123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u1",
      "name": "Priya Sharma",
      "email": "priya@hospital.com",
      "role": "nurse",
      "department": "Emergency",
      "avatar": "https://...",
      "phone": "+91 98765 43210"
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

### POST `/auth/logout`
Logout and invalidate token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST `/auth/forgot-password`
Request password reset OTP.

**Request:**
```json
{
  "email": "priya@hospital.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to email",
  "otpExpiry": "2024-01-15T10:30:00Z"
}
```

---

### POST `/auth/verify-otp`
Verify OTP for password reset.

**Request:**
```json
{
  "email": "priya@hospital.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "resetToken": "temporary_reset_token"
}
```

---

### POST `/auth/reset-password`
Reset password with verified token.

**Request:**
```json
{
  "resetToken": "temporary_reset_token",
  "newPassword": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### POST `/auth/change-password`
Change password for logged-in user.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### POST `/auth/refresh-token`
Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

---

## 2. User Profile

### GET `/users/me`
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "u1",
    "name": "Priya Sharma",
    "email": "priya@hospital.com",
    "role": "nurse",
    "department": "Emergency",
    "avatar": "https://...",
    "phone": "+91 98765 43210",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### PUT `/users/me`
Update current user profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Priya Sharma",
  "phone": "+91 98765 43211",
  "department": "OPD"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "u1",
    "name": "Priya Sharma",
    "email": "priya@hospital.com",
    "role": "nurse",
    "department": "OPD",
    "phone": "+91 98765 43211"
  }
}
```

---

### POST `/users/me/avatar`
Upload/update profile photo.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request:** Form data with `avatar` file field

**Response (200):**
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://storage.../avatar_u1.jpg"
  }
}
```

---

### DELETE `/users/me/avatar`
Remove profile photo.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar removed"
}
```

---

## 3. User Settings

### GET `/users/me/settings`
Get user settings.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "theme": "light",
    "language": "en",
    "emailNotifications": true,
    "pushNotifications": true,
    "alertSound": true,
    "criticalAlertsOnly": false,
    "showOnlineStatus": true,
    "showActivityStatus": true,
    "twoFactorAuth": false,
    "sessionTimeout": 30
  }
}
```

---

### PUT `/users/me/settings`
Update user settings.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "theme": "dark",
  "language": "hi",
  "emailNotifications": false,
  "pushNotifications": true,
  "alertSound": true,
  "criticalAlertsOnly": true,
  "showOnlineStatus": false,
  "showActivityStatus": false,
  "twoFactorAuth": true,
  "sessionTimeout": 60
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated settings */ }
}
```

---

### POST `/users/me/2fa/enable`
Enable two-factor authentication.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["abc123", "def456", "ghi789"]
  }
}
```

---

### POST `/users/me/2fa/verify`
Verify and activate 2FA.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA enabled successfully"
}
```

---

### POST `/users/me/2fa/disable`
Disable two-factor authentication.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "password": "currentPassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA disabled"
}
```

---

## 4. Patients

### GET `/patients`
Get all patients with filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` - active, discharged, critical, all (default: active)
- `department` - Emergency, OPD, ICU, etc.
- `priority` - 1, 2, 3, 4, 5 (triage level)
- `search` - search by name or ID
- `page` - pagination (default: 1)
- `limit` - items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "P001",
        "name": "Ramesh Kumar",
        "age": 45,
        "gender": "M",
        "complaint": "Chest pain, shortness of breath",
        "priority": 1,
        "priorityLabel": "Critical",
        "status": "active",
        "bed": "ICU-3",
        "department": "Emergency",
        "admittedAt": "2024-01-15T08:30:00Z",
        "assignedDoctor": "Dr. Ananya Reddy",
        "assignedNurse": "Priya Sharma",
        "photo": "https://...",
        "vitals": {
          "hr": 112,
          "bp": "165/95",
          "spo2": 91,
          "temp": 99.2,
          "recordedAt": "2024-01-15T09:00:00Z"
        },
        "isPoliceCase": false
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

---

### GET `/patients/:id`
Get single patient details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "P001",
    "name": "Ramesh Kumar",
    "age": 45,
    "gender": "M",
    "phone": "+91 98765 12345",
    "emergencyContact": "+91 98765 67890",
    "address": "123 Main St, City",
    "complaint": "Chest pain, shortness of breath",
    "history": "Diabetes, Hypertension",
    "allergies": ["Penicillin"],
    "priority": 1,
    "priorityLabel": "Critical",
    "status": "active",
    "bed": "ICU-3",
    "department": "Emergency",
    "admittedAt": "2024-01-15T08:30:00Z",
    "assignedDoctor": {
      "id": "u2",
      "name": "Dr. Ananya Reddy"
    },
    "assignedNurse": {
      "id": "u1",
      "name": "Priya Sharma"
    },
    "photo": "https://...",
    "vitalsHistory": [],
    "notes": [],
    "prescriptions": [],
    "labResults": [],
    "isPoliceCase": false,
    "policeCaseDetails": null
  }
}
```

---

### POST `/patients`
Register new patient (New ER Arrival).

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data` (if photo included)

**Request:**
```json
{
  "name": "Vijay Mehta",
  "age": "32",
  "gender": "M",
  "complaint": "Road accident injuries, multiple fractures",
  "phone": "+91 98765 11111",
  "emergencyContact": "+91 98765 22222",
  "vitals": {
    "hr": "112",
    "bp": "165/95",
    "spo2": "91"
  },
  "isPoliceCase": true,
  "policeCaseType": "road_accident",
  "photo": "<file>"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "P006",
    "name": "Vijay Mehta",
    "priority": null,
    "status": "pending_triage",
    "message": "Patient registered. AI Triage pending."
  }
}
```

---

### PUT `/patients/:id`
Update patient details.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "complaint": "Updated symptoms",
  "bed": "Ward-B-5",
  "assignedDoctor": "u2",
  "assignedNurse": "u1"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated patient */ }
}
```

---

### POST `/patients/:id/photo`
Upload/update patient photo.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request:** Form data with `photo` file field

**Response (200):**
```json
{
  "success": true,
  "data": {
    "photoUrl": "https://storage.../patient_P001.jpg"
  }
}
```

---

### POST `/patients/:id/discharge`
Discharge patient.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `doctor`

**Request:**
```json
{
  "dischargeNotes": "Patient recovered. Follow-up in 2 weeks.",
  "prescriptions": [
    {
      "medication": "Paracetamol",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "5 days"
    }
  ],
  "followUpDate": "2024-01-29"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "P001",
    "status": "discharged",
    "dischargedAt": "2024-01-15T16:00:00Z",
    "dischargedBy": "Dr. Ananya Reddy"
  }
}
```

---

## 5. AI Triage

### POST `/patients/:id/triage`
Run AI triage on patient.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "complaint": "Chest pain, shortness of breath",
  "vitals": {
    "hr": 112,
    "bp": "165/95",
    "spo2": 91
  },
  "age": 45,
  "gender": "M",
  "history": "Diabetes, Hypertension"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "priority": 1,
    "priorityLabel": "Critical",
    "priorityColor": "red",
    "reasoning": "Patient presents with chest pain and low SpO2. Combined with history of hypertension, indicates possible cardiac event.",
    "recommendations": [
      "Immediate ECG",
      "Cardiac enzyme panel",
      "Cardiology consultation",
      "Continuous monitoring"
    ],
    "suggestedDepartment": "Cardiology/ICU",
    "estimatedWaitTime": "Immediate",
    "confidence": 0.92
  }
}
```

---

### POST `/triage/quick`
Quick triage without patient registration (for assessment).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "complaint": "Mild fever and headache",
  "vitals": {
    "hr": 78,
    "bp": "120/80",
    "spo2": 98
  },
  "age": 28,
  "gender": "F"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "priority": 4,
    "priorityLabel": "Low",
    "reasoning": "Stable vitals with common symptoms.",
    "recommendations": ["OPD consultation recommended"],
    "estimatedWaitTime": "45-60 minutes"
  }
}
```

---

## 6. Vitals

### GET `/patients/:id/vitals`
Get patient vitals history.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `from` - start date (ISO)
- `to` - end date (ISO)
- `limit` - number of records (default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "current": {
      "hr": 112,
      "bp": "165/95",
      "spo2": 91,
      "temp": 99.2,
      "respiratoryRate": 22,
      "recordedAt": "2024-01-15T09:00:00Z",
      "recordedBy": "Priya Sharma"
    },
    "history": [
      {
        "hr": 108,
        "bp": "160/92",
        "spo2": 92,
        "temp": 99.0,
        "respiratoryRate": 20,
        "recordedAt": "2024-01-15T08:00:00Z",
        "recordedBy": "Priya Sharma"
      }
    ]
  }
}
```

---

### POST `/patients/:id/vitals`
Record new vitals.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "hr": 98,
  "bp": "140/85",
  "spo2": 95,
  "temp": 98.6,
  "respiratoryRate": 18,
  "notes": "Patient showing improvement"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "v123",
    "patientId": "P001",
    "hr": 98,
    "bp": "140/85",
    "spo2": 95,
    "temp": 98.6,
    "respiratoryRate": 18,
    "notes": "Patient showing improvement",
    "recordedAt": "2024-01-15T10:00:00Z",
    "recordedBy": "Priya Sharma",
    "alerts": []
  }
}
```

---

### POST `/vitals/ocr`
Extract vitals from image using OCR.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request:** Form data with `image` file field

**Response (200):**
```json
{
  "success": true,
  "data": {
    "extracted": {
      "hr": "112",
      "bp": "165/95",
      "spo2": "91",
      "temp": "99.2"
    },
    "confidence": {
      "hr": 0.95,
      "bp": 0.88,
      "spo2": 0.92,
      "temp": 0.90
    },
    "rawText": "HR: 112 bpm, BP: 165/95 mmHg..."
  }
}
```

---

## 7. Notes & Comments

### GET `/patients/:id/notes`
Get patient notes.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type` - all, nurse, doctor (default: all)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "n1",
      "type": "nurse",
      "content": "Patient complained of nausea. Administered anti-emetic.",
      "createdAt": "2024-01-15T09:30:00Z",
      "createdBy": {
        "id": "u1",
        "name": "Priya Sharma",
        "role": "nurse"
      }
    },
    {
      "id": "n2",
      "type": "doctor",
      "content": "ECG shows ST elevation. Starting thrombolytic therapy.",
      "createdAt": "2024-01-15T09:45:00Z",
      "createdBy": {
        "id": "u2",
        "name": "Dr. Ananya Reddy",
        "role": "doctor"
      }
    }
  ]
}
```

---

### POST `/patients/:id/notes`
Add note to patient.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "nurse",
  "content": "Vitals check completed. Patient stable."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "n3",
    "type": "nurse",
    "content": "Vitals check completed. Patient stable.",
    "createdAt": "2024-01-15T10:00:00Z",
    "createdBy": {
      "id": "u1",
      "name": "Priya Sharma"
    }
  }
}
```

---

## 8. Alerts

### GET `/alerts`
Get alerts for current user based on role.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `priority` - all, critical, high, medium, low, info
- `status` - all, unread, read, acknowledged, resolved
- `category` - Vitals, Medication, Police Case, etc.
- `page` - pagination
- `limit` - items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "a1",
        "title": "Critical Vitals - ICU Bed 3",
        "message": "Patient Ramesh Kumar showing critical BP drop (80/50).",
        "priority": "critical",
        "status": "unread",
        "category": "Vitals",
        "forRoles": ["doctor", "nurse", "admin"],
        "patient": {
          "id": "P001",
          "name": "Ramesh Kumar",
          "bed": "ICU-3"
        },
        "createdAt": "2024-01-15T09:58:00Z",
        "readAt": null,
        "acknowledgedAt": null,
        "resolvedAt": null
      }
    ],
    "counts": {
      "total": 12,
      "unread": 5,
      "critical": 2
    },
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 20
    }
  }
}
```

---

### GET `/alerts/:id`
Get single alert details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "a1",
    "title": "Critical Vitals - ICU Bed 3",
    "message": "Patient Ramesh Kumar showing critical BP drop (80/50).",
    "priority": "critical",
    "status": "unread",
    "category": "Vitals",
    "forRoles": ["doctor", "nurse", "admin"],
    "patient": {
      "id": "P001",
      "name": "Ramesh Kumar",
      "bed": "ICU-3"
    },
    "metadata": {
      "triggeredBy": "vitals_monitor",
      "threshold": "BP < 90/60",
      "actualValue": "80/50"
    },
    "createdAt": "2024-01-15T09:58:00Z",
    "history": [
      {
        "action": "created",
        "timestamp": "2024-01-15T09:58:00Z"
      }
    ]
  }
}
```

---

### PUT `/alerts/:id/read`
Mark alert as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "a1",
    "status": "read",
    "readAt": "2024-01-15T10:00:00Z",
    "readBy": "Priya Sharma"
  }
}
```

---

### PUT `/alerts/:id/acknowledge`
Acknowledge alert.

**Headers:** `Authorization: Bearer <token>`

**Request (optional):**
```json
{
  "notes": "Attending to patient now"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "a1",
    "status": "acknowledged",
    "acknowledgedAt": "2024-01-15T10:01:00Z",
    "acknowledgedBy": "Dr. Ananya Reddy"
  }
}
```

---

### PUT `/alerts/:id/resolve`
Resolve alert.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "resolution": "Patient stabilized. BP now 110/70."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "a1",
    "status": "resolved",
    "resolvedAt": "2024-01-15T10:30:00Z",
    "resolvedBy": "Dr. Ananya Reddy",
    "resolution": "Patient stabilized. BP now 110/70."
  }
}
```

---

### DELETE `/alerts/:id`
Dismiss/delete alert.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Alert dismissed"
}
```

---

### POST `/alerts/:id/forward`
Forward/reassign alert to another role.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "toRole": "doctor",
  "notes": "Needs doctor review"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "a1",
    "forRoles": ["nurse", "doctor"],
    "forwardedAt": "2024-01-15T10:05:00Z",
    "forwardedBy": "Priya Sharma"
  }
}
```

---

### POST `/alerts`
Create new alert (system or manual).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Equipment Maintenance Required",
  "message": "Ventilator #3 showing error codes",
  "priority": "high",
  "category": "Equipment",
  "forRoles": ["admin"],
  "patientId": null
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "a15",
    "title": "Equipment Maintenance Required",
    "status": "unread",
    "createdAt": "2024-01-15T10:10:00Z"
  }
}
```

---

## 9. Police Cases

### POST `/police-cases`
Create police case alert (nurse flags during registration).

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `nurse`

**Request:**
```json
{
  "patientId": "P006",
  "patientName": "Vijay Mehta",
  "caseType": "road_accident",
  "description": "Patient brought in with injuries from road accident",
  "complaint": "Multiple fractures, head injury"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "pc1",
    "alertId": "a13",
    "patientId": "P006",
    "caseType": "road_accident",
    "caseTypeLabel": "Road Traffic Accident",
    "status": "pending",
    "reportedBy": "Priya Sharma",
    "reportedAt": "2024-01-15T10:00:00Z",
    "policeContacted": false
  }
}
```

---

### GET `/police-cases`
Get all police cases.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Query Parameters:**
- `status` - pending, police_contacted, resolved
- `caseType` - road_accident, assault, domestic_violence, etc.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "pc1",
      "patientId": "P006",
      "patientName": "Vijay Mehta",
      "caseType": "road_accident",
      "caseTypeLabel": "Road Traffic Accident",
      "status": "pending",
      "reportedBy": "Priya Sharma",
      "reportedAt": "2024-01-15T10:00:00Z",
      "policeContacted": false,
      "policeContactedAt": null,
      "policeContactedBy": null,
      "policeStation": null,
      "firNumber": null
    }
  ]
}
```

---

### PUT `/police-cases/:id/contact-police`
Mark police as contacted.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Request:**
```json
{
  "policeStation": "Central Police Station",
  "officerName": "Inspector Sharma",
  "officerPhone": "+91 98765 00000",
  "firNumber": "FIR/2024/001",
  "notes": "Police officer will visit hospital within 1 hour"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "pc1",
    "status": "police_contacted",
    "policeContacted": true,
    "policeContactedAt": "2024-01-15T10:15:00Z",
    "policeContactedBy": "Rajesh Kumar",
    "policeStation": "Central Police Station",
    "firNumber": "FIR/2024/001"
  }
}
```

---

### PUT `/police-cases/:id/resolve`
Resolve police case.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Request:**
```json
{
  "resolution": "Police documentation completed. Case handed over to investigating officer.",
  "firNumber": "FIR/2024/001"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "pc1",
    "status": "resolved",
    "resolvedAt": "2024-01-15T12:00:00Z",
    "resolvedBy": "Rajesh Kumar"
  }
}
```

---

## 10. Staff Management (Admin)

### GET `/admin/staff`
Get all staff members.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Query Parameters:**
- `role` - nurse, doctor, admin, all
- `department` - Emergency, OPD, etc.
- `status` - active, inactive
- `search` - search by name or email

**Response (200):**
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "id": "u1",
        "name": "Priya Sharma",
        "email": "priya@hospital.com",
        "role": "nurse",
        "department": "Emergency",
        "phone": "+91 98765 43210",
        "status": "active",
        "joinedAt": "2023-06-01",
        "lastActive": "2024-01-15T09:00:00Z"
      }
    ],
    "counts": {
      "total": 25,
      "doctors": 8,
      "nurses": 15,
      "admins": 2
    }
  }
}
```

---

### POST `/admin/staff`
Create new staff member.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Request:**
```json
{
  "name": "Dr. Kavitha Rao",
  "email": "kavitha@hospital.com",
  "password": "tempPassword123",
  "role": "doctor",
  "department": "Cardiology",
  "phone": "+91 98765 55555"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "u10",
    "name": "Dr. Kavitha Rao",
    "email": "kavitha@hospital.com",
    "role": "doctor",
    "department": "Cardiology",
    "status": "active"
  },
  "message": "Staff member created. Temporary password sent to email."
}
```

---

### PUT `/admin/staff/:id`
Update staff member.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Request:**
```json
{
  "department": "ICU",
  "status": "inactive"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated staff */ }
}
```

---

### DELETE `/admin/staff/:id`
Delete/deactivate staff member.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Response (200):**
```json
{
  "success": true,
  "message": "Staff member deactivated"
}
```

---

### POST `/admin/staff/:id/reset-password`
Reset staff member password.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent to staff member"
}
```

---

## 11. Dashboard & Statistics

### GET `/dashboard/stats`
Get dashboard statistics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patients": {
      "total": 45,
      "critical": 5,
      "inER": 12,
      "inICU": 8,
      "inWard": 20,
      "pendingDischarge": 5
    },
    "beds": {
      "total": 100,
      "occupied": 73,
      "available": 27,
      "byDepartment": {
        "ICU": { "total": 10, "occupied": 8 },
        "Emergency": { "total": 20, "occupied": 12 },
        "General": { "total": 70, "occupied": 53 }
      }
    },
    "alerts": {
      "unread": 5,
      "critical": 2
    },
    "todayStats": {
      "admissions": 8,
      "discharges": 5,
      "emergencies": 3
    }
  }
}
```

---

### GET `/dashboard/recent-patients`
Get recent patient activity.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` - number of patients (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "P006",
      "name": "Vijay Mehta",
      "action": "admitted",
      "timestamp": "2024-01-15T10:00:00Z",
      "department": "Emergency"
    }
  ]
}
```

---

### GET `/dashboard/alerts-summary`
Get alerts summary for header badge.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5,
    "criticalCount": 2,
    "recentAlerts": [
      {
        "id": "a1",
        "title": "Critical Vitals",
        "priority": "critical",
        "timestamp": "2024-01-15T09:58:00Z"
      }
    ]
  }
}
```

---

## 12. Beds Management

### GET `/beds`
Get all beds with status.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `department` - ICU, Emergency, General, etc.
- `status` - available, occupied, maintenance

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ICU-1",
      "department": "ICU",
      "status": "occupied",
      "patient": {
        "id": "P001",
        "name": "Ramesh Kumar"
      }
    },
    {
      "id": "ICU-2",
      "department": "ICU",
      "status": "available",
      "patient": null
    }
  ]
}
```

---

### PUT `/beds/:id/assign`
Assign patient to bed.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "patientId": "P006"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bedId": "ER-5",
    "patientId": "P006",
    "assignedAt": "2024-01-15T10:05:00Z"
  }
}
```

---

### PUT `/beds/:id/release`
Release bed (on discharge/transfer).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bedId": "ER-5",
    "status": "available",
    "releasedAt": "2024-01-15T16:00:00Z"
  }
}
```

---

## 13. Prescriptions

### GET `/patients/:id/prescriptions`
Get patient prescriptions.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "rx1",
      "medication": "Aspirin",
      "dosage": "75mg",
      "frequency": "Once daily",
      "duration": "Ongoing",
      "instructions": "Take with food",
      "prescribedBy": "Dr. Ananya Reddy",
      "prescribedAt": "2024-01-15T10:00:00Z",
      "status": "active"
    }
  ]
}
```

---

### POST `/patients/:id/prescriptions`
Add prescription.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `doctor`

**Request:**
```json
{
  "medication": "Metformin",
  "dosage": "500mg",
  "frequency": "Twice daily",
  "duration": "30 days",
  "instructions": "Take after meals"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "rx2",
    "medication": "Metformin",
    "prescribedBy": "Dr. Ananya Reddy",
    "prescribedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 14. Lab Results

### GET `/patients/:id/lab-results`
Get patient lab results.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "lab1",
      "testName": "Complete Blood Count",
      "orderedBy": "Dr. Ananya Reddy",
      "orderedAt": "2024-01-15T09:00:00Z",
      "status": "completed",
      "results": {
        "hemoglobin": { "value": 12.5, "unit": "g/dL", "normal": "12-16", "flag": "normal" },
        "wbc": { "value": 11000, "unit": "/uL", "normal": "4000-11000", "flag": "normal" },
        "platelets": { "value": 250000, "unit": "/uL", "normal": "150000-400000", "flag": "normal" }
      },
      "completedAt": "2024-01-15T10:30:00Z",
      "reportUrl": "https://..."
    }
  ]
}
```

---

### POST `/patients/:id/lab-orders`
Order lab test.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `doctor`

**Request:**
```json
{
  "tests": ["CBC", "Cardiac Enzymes", "Lipid Profile"],
  "priority": "urgent",
  "notes": "Rule out MI"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "orderId": "lo1",
    "tests": ["CBC", "Cardiac Enzymes", "Lipid Profile"],
    "status": "ordered",
    "orderedAt": "2024-01-15T09:00:00Z"
  }
}
```

---

## 15. Inventory (Admin)

### GET `/admin/inventory`
Get inventory status.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "inv1",
        "name": "IV Fluid (Normal Saline)",
        "category": "Supplies",
        "currentStock": 45,
        "minimumStock": 100,
        "unit": "bottles",
        "status": "low",
        "lastRestocked": "2024-01-10"
      }
    ],
    "alerts": [
      {
        "itemId": "inv1",
        "message": "IV Fluid stock below minimum threshold"
      }
    ]
  }
}
```

---

### POST `/admin/inventory/restock`
Record restock.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin`

**Request:**
```json
{
  "itemId": "inv1",
  "quantity": 200,
  "supplier": "MedSupply Co.",
  "invoiceNumber": "INV-2024-001"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "itemId": "inv1",
    "newStock": 245,
    "status": "adequate"
  }
}
```

---

## Error Responses

All endpoints return consistent error format:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "code": "FORBIDDEN",
  "requiredRole": "admin"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Resource not found",
  "code": "NOT_FOUND"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "requestId": "req_abc123"
}
```

---

## WebSocket Events (Real-time)

For real-time updates, implement WebSocket connection:

**Connection:** `wss://api.hospital.com/ws?token=<jwt_token>`

### Server → Client Events:

```javascript
// New alert
{ "event": "alert:new", "data": { /* alert object */ } }

// Alert updated
{ "event": "alert:updated", "data": { "id": "a1", "status": "acknowledged" } }

// Patient vitals critical
{ "event": "vitals:critical", "data": { "patientId": "P001", "vitals": { ... } } }

// Bed status changed
{ "event": "bed:updated", "data": { "bedId": "ICU-1", "status": "available" } }

// New patient admitted
{ "event": "patient:admitted", "data": { /* patient summary */ } }

// Patient discharged
{ "event": "patient:discharged", "data": { "patientId": "P001" } }
```

### Client → Server Events:

```javascript
// Subscribe to specific patient updates
{ "event": "subscribe", "channel": "patient:P001" }

// Unsubscribe
{ "event": "unsubscribe", "channel": "patient:P001" }
```

---

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Auth endpoints: 10 requests/minute
- File uploads: 20 requests/minute

**Rate limit headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705320000
```

---

## Authentication Notes

- JWT tokens expire in 1 hour
- Refresh tokens expire in 7 days
- Include token in header: `Authorization: Bearer <token>`
- For 2FA-enabled accounts, login returns `requiresTwoFactor: true` and requires `/auth/2fa/verify` call

---

## Role-Based Access Summary

| Endpoint | Nurse | Doctor | Admin |
|----------|-------|--------|-------|
| View patients | ✓ | ✓ | ✓ |
| Register patients | ✓ | ✓ | ✓ |
| Add nurse notes | ✓ | ✓ | ✓ |
| Add doctor notes | ✗ | ✓ | ✗ |
| Prescribe medication | ✗ | ✓ | ✗ |
| Order labs | ✗ | ✓ | ✗ |
| Discharge patients | ✗ | ✓ | ✗ |
| Flag police cases | ✓ | ✓ | ✓ |
| Contact police | ✗ | ✗ | ✓ |
| Manage staff | ✗ | ✗ | ✓ |
| View inventory | ✗ | ✗ | ✓ |
| System settings | ✗ | ✗ | ✓ |
