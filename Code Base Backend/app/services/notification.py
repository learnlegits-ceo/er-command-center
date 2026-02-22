"""
Notification Service using Trigger.dev.

Handles sending notifications via:
- Email (Resend)
- Push notifications

This is a wrapper around TriggerDevService to maintain backward compatibility
with existing code that uses NotificationService.
"""

from typing import Optional, Dict, Any, List

from app.services.jobs import TriggerDevService


class NotificationService:
    """Notification service using Trigger.dev for background job processing."""

    def __init__(self):
        self.trigger_service = TriggerDevService()

    async def send_email(
        self,
        email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        priority: str = "normal"
    ) -> Dict[str, Any]:
        """Send email notification via Trigger.dev."""
        return await self.trigger_service.send_email(
            to=email,
            subject=subject,
            body=body,
            html_body=html_body,
            priority=priority
        )

    async def send_push(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        priority: str = "normal"
    ) -> Dict[str, Any]:
        """Send push notification via Trigger.dev."""
        return await self.trigger_service.send_push_notification(
            user_id=user_id,
            title=title,
            body=body,
            data=data,
            priority=priority
        )

    async def send_alert_notification(
        self,
        alert_id: str,
        title: str,
        message: str,
        priority: str,
        target_users: List[str],
        target_roles: List[str]
    ) -> Dict[str, Any]:
        """Send alert notification to multiple users/roles via Trigger.dev."""
        return await self.trigger_service.process_alert(
            alert_id=alert_id,
            title=title,
            message=message,
            priority=priority,
            target_users=target_users,
            target_roles=target_roles
        )

    async def send_critical_vitals_alert(
        self,
        patient_id: str,
        patient_name: str,
        bed_number: str,
        vitals_message: str,
        target_roles: List[str] = None
    ) -> Dict[str, Any]:
        """Send critical vitals alert via Trigger.dev."""
        if target_roles is None:
            target_roles = ["doctor", "nurse", "admin"]

        return await self.trigger_service.send_critical_vitals_alert(
            patient_id=patient_id,
            patient_name=patient_name,
            bed_number=bed_number,
            message=vitals_message,
            target_roles=target_roles
        )

    async def send_police_case_alert(
        self,
        case_id: str,
        patient_name: str,
        case_type: str,
        reported_by: str
    ) -> Dict[str, Any]:
        """Send police case alert to admins via Trigger.dev."""
        return await self.trigger_service.send_police_case_alert(
            case_id=case_id,
            patient_name=patient_name,
            case_type=case_type,
            reported_by=reported_by
        )

    async def send_batch(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Send batch of notifications via Trigger.dev."""
        return await self.trigger_service.trigger_batch_notifications(
            notifications=messages
        )
