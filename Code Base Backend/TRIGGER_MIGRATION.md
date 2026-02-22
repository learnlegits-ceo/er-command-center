# AWS SQS to Trigger.dev Migration

This document summarizes the migration from AWS SQS to Trigger.dev for background job processing.

## What Changed

### ✅ Services Replaced

| Old Service | New Service | Purpose |
|------------|-------------|---------|
| AWS SQS | Trigger.dev | Background job queue |
| AWS SES | Resend (via Trigger.dev) | Email notifications |
| Lambda Worker | Trigger.dev Jobs | Job processing |

### 📁 Files Modified

#### 1. **Configuration Files**
- `.env.example` - Added Trigger.dev and Resend configuration
- `app/core/config.py` - Updated with new Trigger.dev settings
- `docker-compose.yml` - Replaced AWS/SQS env vars with Trigger.dev vars

#### 2. **Service Layer**
- `app/services/notification.py` - Completely rewritten to use Trigger.dev
- `app/services/jobs.py` - **NEW** - TriggerDevService wrapper class

#### 3. **Database Schema**
- `database_schema.sql` - Updated tables:
  - `notifications` table: Replaced `sqs_message_id`/`sqs_queue_url` with `trigger_job_id`/`trigger_run_id`
  - `sqs_messages` table → `trigger_jobs` table
- `demo_health.sql` - Same changes as above

#### 4. **Dependencies**
- `requirements.txt` - Removed `boto3` and `aioboto3` (AWS SDK)

#### 5. **Workers**
- `workers/notification_processor.py` - **DEPRECATED** - Marked as no longer used

#### 6. **Documentation**
- `README.md` - Updated tech stack to mention Trigger.dev
- `trigger/README.md` - **NEW** - Complete Trigger.dev setup guide
- `trigger/jobs.ts` - **NEW** - All job definitions
- `trigger/package.json` - **NEW** - Trigger.dev dependencies

## 🎯 New Architecture

```
Backend (FastAPI)
    ↓ HTTP POST
Trigger.dev API
    ↓ executes
Background Job (TypeScript)
    ↓ calls
External APIs (Resend, Firebase)
```

## 📋 Background Jobs Available

### Notifications
1. **send-email** - Send email via Resend
2. **send-push** - Send push notification

### Alerts
3. **process-alert** - Process and distribute alerts
4. **critical-vitals-alert** - Critical patient vitals
5. **police-case-alert** - MLC case notifications

### Scheduled
6. **patient-followup** - Follow-up reminders
7. **cleanup-old-data** - Daily data cleanup (runs at 2 AM)

### Batch
8. **batch-notifications** - Process multiple notifications

## 🔑 Required API Keys

Get your API keys from:

1. **Trigger.dev**: https://trigger.dev
   - Free tier: 100,000 job runs/month

2. **Resend** (Email): https://resend.com
   - Free tier: 100 emails/day

## 🚀 Setup Instructions

### 1. Update Environment Variables

Edit your `.env` file with:

```bash
# Trigger.dev (Background Jobs)
TRIGGER_API_KEY=tr_dev_your_trigger_api_key_here
TRIGGER_API_URL=https://api.trigger.dev

# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key_here
FROM_EMAIL=noreply@ercommandcenter.com
```

### 2. Install Trigger.dev Dependencies

```bash
cd trigger
npm install
```

### 3. Run Trigger.dev Dev Server

```bash
cd trigger
npm run dev
```

This starts the Trigger.dev development server and watches for job changes.

### 4. Deploy Trigger.dev Jobs (Production)

```bash
cd trigger
npm run deploy
```

### 5. Update Database Schema

The database schema has changed. Run migrations:

```bash
# If using Docker
docker-compose exec backend alembic revision --autogenerate -m "migrate to trigger.dev"
docker-compose exec backend alembic upgrade head

# Or locally
alembic revision --autogenerate -m "migrate to trigger.dev"
alembic upgrade head
```

Or simply restart Docker with volume reset:

```bash
docker-compose down -v
docker-compose up -d
```

## 📝 Code Changes Required

The API interface remains the same! No changes needed in your route handlers.

### Old Code (Still Works!)
```python
from app.services.notification import NotificationService

notification_service = NotificationService()
await notification_service.send_email(
    email="doctor@hospital.com",
    subject="Critical Alert",
    body="Patient needs immediate attention",
    priority="high"
)
```

The `NotificationService` now internally uses `TriggerDevService`, so existing code continues to work without modification.

### New Code (Direct Access)
```python
from app.services.jobs import TriggerDevService

trigger_service = TriggerDevService()
await trigger_service.send_email(
    to="doctor@hospital.com",
    subject="Critical Alert",
    body="Patient needs immediate attention",
    priority="high"
)
```

## 🎉 Benefits of Trigger.dev

1. **No Infrastructure Management** - No need to manage SQS queues, Lambda functions
2. **Better DX** - TypeScript job definitions with full IDE support
3. **Better Monitoring** - Built-in dashboard for job runs
4. **Automatic Retries** - Configurable retry logic built-in
5. **Cost Effective** - Free tier covers most use cases
6. **Easier Testing** - Test jobs locally with `npm run dev`

## 💰 Cost Comparison

### Old (AWS)
- SQS: ~$0.40 per million requests
- Lambda: ~$0.20 per million requests
- SES (Email): ~$0.10 per 1000 emails
- **Estimated**: $15-30/month for small hospital

### New (Trigger.dev + Resend)
- Trigger.dev: Free (up to 100K runs/month)
- Resend: Free (100 emails/day)
- **Estimated**: $0-10/month for small hospital (Free tier covers most use cases)

## 🔄 Rollback Plan

If you need to rollback to AWS SQS:

1. Restore `boto3` and `aioboto3` in `requirements.txt`
2. Restore old `app/services/notification.py` from git history
3. Update `.env` with AWS credentials
4. Restore database schema (old `notifications` and `sqs_messages` tables)

## 📚 Additional Resources

- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Resend Documentation](https://resend.com/docs)
- [trigger/README.md](trigger/README.md) - Detailed setup guide

## ✅ Migration Checklist

- [x] Update configuration files
- [x] Create TriggerDevService
- [x] Update NotificationService wrapper
- [x] Create Trigger.dev job definitions
- [x] Update database schema
- [x] Remove AWS dependencies
- [x] Remove SMS/Twilio functionality
- [x] Update documentation
- [ ] Get API keys (Trigger.dev, Resend)
- [ ] Run Trigger.dev dev server
- [ ] Test email sending
- [ ] Deploy Trigger.dev jobs to production
- [ ] Update database with new schema

## 🆘 Troubleshooting

### Trigger.dev jobs not running
```bash
# Check Trigger.dev dev server is running
cd trigger
npm run dev

# Check logs in Trigger.dev dashboard
# https://trigger.dev/dashboard
```

### Email not sending
- Verify Resend API key in `.env`
- Check sender email domain is verified in Resend
- Check Trigger.dev logs for errors

---

**Migration Date**: 2026-01-31
**Status**: ✅ Complete - Ready for testing
