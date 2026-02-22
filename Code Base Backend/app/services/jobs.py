"""
Background Jobs Service using Trigger.dev

Handles asynchronous tasks:
- Sending notifications (email, push)
- Processing alerts
- Data synchronization
"""

from typing import Dict, Any, Optional, List
import httpx
from datetime import datetime

from app.core.config import settings


class TriggerDevService:
    """Trigger.dev background jobs service."""

    def __init__(self):
        self.api_key = getattr(settings, 'TRIGGER_API_KEY', None)
        self.api_url = getattr(settings, 'TRIGGER_API_URL', 'https://api.trigger.dev')
        self.client = httpx.AsyncClient(
            base_url=self.api_url,
            headers={
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            } if self.api_key else {}
        )

    async def trigger_job(
        self,
        job_id: str,
        payload: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Trigger a background job.

        Args:
            job_id: The job identifier (e.g., 'send-notification', 'process-alert')
            payload: Job data
            options: Job options (delay, timeout, etc.)
        """
        if not self.api_key:
            # Development mode - log and return mock response
            print(f"[Trigger.dev Mock] Job: {job_id}")
            print(f"[Trigger.dev Mock] Payload: {payload}")
            return {
                "id": f"mock-{job_id}-{datetime.utcnow().timestamp()}",
                "status": "queued",
                "mock": True
            }

        try:
            response = await self.client.post(
                f'/api/v1/jobs/{job_id}/trigger',
                json={
                    "payload": payload,
                    "options": options or {}
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Trigger.dev error: {e}")
            return {"error": str(e), "status": "failed"}

    # ==================== Notification Jobs ====================

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        priority: str = "normal"
    ) -> Dict[str, Any]:
        """Send email notification."""
        return await self.trigger_job(
            "send-email",
            {
                "type": "email",
                "to": to,
                "subject": subject,
                "body": body,
                "html_body": html_body,
                "priority": priority,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    async def send_push_notification(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        priority: str = "normal"
    ) -> Dict[str, Any]:
        """Send push notification."""
        return await self.trigger_job(
            "send-push",
            {
                "type": "push",
                "user_id": user_id,
                "title": title,
                "body": body,
                "data": data or {},
                "priority": priority,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    # ==================== Alert Jobs ====================

    async def process_alert(
        self,
        alert_id: str,
        title: str,
        message: str,
        priority: str,
        target_users: List[str],
        target_roles: List[str]
    ) -> Dict[str, Any]:
        """Process and distribute alert to target users."""
        return await self.trigger_job(
            "process-alert",
            {
                "alert_id": alert_id,
                "title": title,
                "message": message,
                "priority": priority,
                "target_users": target_users,
                "target_roles": target_roles,
                "timestamp": datetime.utcnow().isoformat()
            },
            options={"priority": "high" if priority == "critical" else "normal"}
        )

    async def send_critical_vitals_alert(
        self,
        patient_id: str,
        patient_name: str,
        bed_number: str,
        vitals_message: str,
        target_roles: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Send critical vitals alert - high priority."""
        if target_roles is None:
            target_roles = ["doctor", "nurse", "admin"]

        return await self.trigger_job(
            "critical-vitals-alert",
            {
                "patient_id": patient_id,
                "patient_name": patient_name,
                "bed_number": bed_number,
                "message": vitals_message,
                "target_roles": target_roles,
                "timestamp": datetime.utcnow().isoformat()
            },
            options={"priority": "critical", "timeout": 300}
        )

    async def send_police_case_alert(
        self,
        case_id: str,
        patient_name: str,
        case_type: str,
        reported_by: str
    ) -> Dict[str, Any]:
        """Send police case alert to admins."""
        return await self.trigger_job(
            "police-case-alert",
            {
                "case_id": case_id,
                "patient_name": patient_name,
                "case_type": case_type,
                "reported_by": reported_by,
                "target_roles": ["admin"],
                "timestamp": datetime.utcnow().isoformat()
            },
            options={"priority": "high"}
        )

    # ==================== Scheduled Jobs ====================

    async def schedule_reminder(
        self,
        reminder_id: str,
        user_id: str,
        message: str,
        schedule_at: str
    ) -> Dict[str, Any]:
        """Schedule a reminder."""
        return await self.trigger_job(
            "schedule-reminder",
            {
                "reminder_id": reminder_id,
                "user_id": user_id,
                "message": message
            },
            options={"delay": schedule_at}
        )

    async def schedule_patient_followup(
        self,
        patient_id: str,
        doctor_id: str,
        followup_date: str,
        notes: str
    ) -> Dict[str, Any]:
        """Schedule patient follow-up reminder."""
        return await self.trigger_job(
            "patient-followup",
            {
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "followup_date": followup_date,
                "notes": notes
            },
            options={"delay": followup_date}
        )

    # ==================== Batch Operations ====================

    async def send_batch_notifications(
        self,
        notifications: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Send batch notifications."""
        return await self.trigger_job(
            "batch-notifications",
            {
                "notifications": notifications,
                "count": len(notifications),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    async def cleanup_old_data(
        self,
        days_old: int = 90
    ) -> Dict[str, Any]:
        """Cleanup old data (scheduled job)."""
        return await self.trigger_job(
            "cleanup-old-data",
            {
                "days_old": days_old,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Global instance
trigger_service = TriggerDevService()
