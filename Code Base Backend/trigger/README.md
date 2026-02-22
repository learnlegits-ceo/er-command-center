# Trigger.dev Background Jobs

This directory contains background job definitions for the ER Command Center.

## Setup

### 1. Create Trigger.dev Account

1. Go to [trigger.dev](https://trigger.dev) and sign up
2. Create a new project
3. Get your API key from the dashboard

### 2. Install Dependencies

```bash
cd trigger
npm install
```

### 3. Configure Environment

Add to your `.env` file:

```bash
# Trigger.dev
TRIGGER_API_KEY=tr_dev_your_key_here
TRIGGER_API_URL=https://api.trigger.dev

# Email (Resend)
RESEND_API_KEY=re_your_key_here
```

### 4. Run Development Server

```bash
npm run dev
```

This starts the Trigger.dev dev server and watches for job changes.

### 5. Deploy to Production

```bash
npm run deploy
```

## Available Jobs

### Notifications
- `send-email` - Send email via Resend
- `send-push` - Send push notification

### Alerts
- `process-alert` - Process and distribute alerts
- `critical-vitals-alert` - Send critical vitals alerts
- `police-case-alert` - Send police case alerts

### Scheduled
- `patient-followup` - Follow-up reminders
- `cleanup-old-data` - Daily data cleanup (runs at 2 AM)

### Batch
- `batch-notifications` - Process multiple notifications

## Usage in Backend

```python
from app.services.jobs import trigger_service

# Send email
await trigger_service.send_email(
    to="doctor@hospital.com",
    subject="Critical Alert",
    body="Patient needs immediate attention"
)

# Process alert
await trigger_service.process_alert(
    alert_id="alert-123",
    title="Critical Vitals",
    message="Patient BP dropped",
    priority="critical",
    target_users=["user1", "user2"],
    target_roles=["doctor", "nurse"]
)
```

## Monitoring

View job runs in the Trigger.dev dashboard:
- https://trigger.dev/dashboard

## Integrations

### Resend (Email)
- Free tier: 100 emails/day
- Sign up: https://resend.com

### Firebase (Push Notifications)
- Free tier available
- Setup: https://firebase.google.com

## Testing

Test jobs locally:

```bash
# Trigger a test job
curl -X POST https://api.trigger.dev/api/v1/jobs/send-email/trigger \
  -H "Authorization: Bearer $TRIGGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "to": "test@example.com",
      "subject": "Test",
      "body": "Test email"
    }
  }'
```

## Architecture

```
Backend (FastAPI)
    ↓ triggers job
Trigger.dev
    ↓ executes
Background Job (TypeScript)
    ↓ calls
External APIs (Resend, Firebase, etc.)
```

## Cost Estimate

**Trigger.dev:** Free tier (up to 100,000 job runs/month)
**Resend:** Free tier (100 emails/day)

Total monthly cost for small hospital: **$0-10** (Free tier covers most use cases)
