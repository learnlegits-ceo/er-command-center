"""
[DEPRECATED] Notification Processor Lambda Worker

⚠️ This file is DEPRECATED and no longer used.

The system now uses Trigger.dev for background job processing instead of AWS SQS/Lambda.
All notification processing is now handled by TypeScript jobs in the /trigger directory.

See:
- app/services/jobs.py - TriggerDevService
- trigger/jobs.ts - Trigger.dev job definitions
- trigger/README.md - Setup instructions

---

This Lambda function processes notification messages from SQS queue and
sends them via appropriate channels (SMS, Email, Push).
"""

import json
import boto3
from typing import Dict, Any

# Initialize AWS clients
sns_client = boto3.client('sns')
ses_client = boto3.client('ses')


def handler(event, context):
    """
    Process SQS messages containing notification requests.
    """
    processed = 0
    failed = 0

    for record in event.get('Records', []):
        try:
            # Parse message body
            body = json.loads(record['body'])
            notification_type = body.get('type')

            print(f"Processing {notification_type} notification")

            if notification_type == 'sms':
                send_sms(body)
            elif notification_type == 'email':
                send_email(body)
            elif notification_type == 'push':
                send_push(body)
            elif notification_type == 'alert':
                process_alert(body)
            elif notification_type == 'critical_vitals':
                process_critical_vitals_alert(body)
            elif notification_type == 'police_case':
                process_police_case_alert(body)
            else:
                print(f"Unknown notification type: {notification_type}")

            processed += 1

        except Exception as e:
            print(f"Error processing message: {e}")
            failed += 1

    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': processed,
            'failed': failed
        })
    }


def send_sms(payload: Dict[str, Any]):
    """Send SMS via AWS SNS."""
    phone = payload.get('recipient')
    message = payload.get('message')

    if not phone or not message:
        print("Missing phone or message")
        return

    try:
        response = sns_client.publish(
            PhoneNumber=phone,
            Message=message,
            MessageAttributes={
                'AWS.SNS.SMS.SMSType': {
                    'DataType': 'String',
                    'StringValue': 'Transactional'
                }
            }
        )
        print(f"SMS sent: {response.get('MessageId')}")
    except Exception as e:
        print(f"SMS error: {e}")
        raise


def send_email(payload: Dict[str, Any]):
    """Send email via AWS SES."""
    recipient = payload.get('recipient')
    subject = payload.get('subject')
    body = payload.get('body')
    html_body = payload.get('html_body')

    if not recipient or not subject or not body:
        print("Missing email parameters")
        return

    try:
        email_body = {'Text': {'Data': body}}
        if html_body:
            email_body['Html'] = {'Data': html_body}

        response = ses_client.send_email(
            Source='noreply@ercommandcenter.com',  # Replace with verified email
            Destination={'ToAddresses': [recipient]},
            Message={
                'Subject': {'Data': subject},
                'Body': email_body
            }
        )
        print(f"Email sent: {response.get('MessageId')}")
    except Exception as e:
        print(f"Email error: {e}")
        raise


def send_push(payload: Dict[str, Any]):
    """Send push notification."""
    user_id = payload.get('user_id')
    title = payload.get('title')
    body = payload.get('body')
    data = payload.get('data', {})

    # TODO: Implement push notification via Firebase/OneSignal
    print(f"Push notification for user {user_id}: {title}")


def process_alert(payload: Dict[str, Any]):
    """Process and distribute alert to target users."""
    alert_id = payload.get('alert_id')
    title = payload.get('title')
    message = payload.get('message')
    priority = payload.get('priority')
    target_users = payload.get('target_users', [])
    target_roles = payload.get('target_roles', [])

    print(f"Processing alert {alert_id} for roles: {target_roles}")

    # TODO: Query users by roles and send push notifications
    # For critical alerts, also send SMS to on-duty staff


def process_critical_vitals_alert(payload: Dict[str, Any]):
    """Process critical vitals alert - high priority."""
    patient_name = payload.get('patient_name')
    bed_number = payload.get('bed_number')
    message = payload.get('message')

    alert_message = f"CRITICAL: {patient_name} ({bed_number}) - {message}"
    print(f"Critical vitals alert: {alert_message}")

    # TODO: Send immediate push to all nurses/doctors on duty
    # TODO: Send SMS to assigned doctor


def process_police_case_alert(payload: Dict[str, Any]):
    """Process police case alert for admin."""
    case_id = payload.get('case_id')
    patient_name = payload.get('patient_name')
    case_type = payload.get('case_type')
    reported_by = payload.get('reported_by')

    alert_message = f"Police Case: {case_type} for {patient_name} reported by {reported_by}"
    print(f"Police case alert: {alert_message}")

    # TODO: Send push and email to admin users
