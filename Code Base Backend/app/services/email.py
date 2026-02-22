"""
Email service using Resend API
"""
import httpx
from typing import Optional
from app.core.config import settings


class EmailService:
    """Service for sending emails via Resend API."""

    def __init__(self):
        self.api_key = settings.RESEND_API_KEY
        self.from_email = settings.FROM_EMAIL
        self.base_url = "https://api.resend.com"

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> dict:
        """
        Send an email using Resend API.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content (optional)

        Returns:
            dict: Response from Resend API
        """
        if not self.api_key or self.api_key == "your-resend-api-key":
            # If API key not configured, log to console instead
            print(f"\n{'='*60}")
            print(f"EMAIL (Development Mode - No API Key)")
            print(f"{'='*60}")
            print(f"To: {to_email}")
            print(f"From: {self.from_email}")
            print(f"Subject: {subject}")
            print(f"{'='*60}")
            print(html_content)
            print(f"{'='*60}\n")

            return {
                "success": True,
                "message": "Email logged to console (Resend API key not configured)",
                "mode": "development"
            }

        # Prepare email data
        email_data = {
            "from": self.from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }

        if text_content:
            email_data["text"] = text_content

        # Send via Resend API
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/emails",
                    json=email_data,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )

                if response.status_code == 200:
                    return {
                        "success": True,
                        "message": "Email sent successfully",
                        "data": response.json(),
                        "mode": "production"
                    }
                else:
                    print(f"Resend API Error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "error": f"Failed to send email: {response.text}",
                        "status_code": response.status_code
                    }

        except Exception as e:
            print(f"Email sending error: {str(e)}")
            return {
                "success": False,
                "error": f"Email sending failed: {str(e)}"
            }

    async def send_otp_email(self, to_email: str, otp: str, user_name: str = "User") -> dict:
        """
        Send OTP email for password reset.

        Args:
            to_email: Recipient email address
            otp: One-time password
            user_name: User's name (optional)

        Returns:
            dict: Email sending result
        """
        subject = f"{settings.APP_NAME} - Password Reset OTP"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp-box {{ background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
                .otp-code {{ font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }}
                .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{settings.APP_NAME}</h1>
                    <p>Password Reset Request</p>
                </div>
                <div class="content">
                    <p>Hello {user_name},</p>
                    <p>You requested to reset your password. Use the OTP code below to proceed:</p>

                    <div class="otp-box">
                        <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Your OTP Code</div>
                        <div class="otp-code">{otp}</div>
                    </div>

                    <p>This OTP is valid for <strong>10 minutes</strong>.</p>

                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Never share this OTP with anyone</li>
                            <li>If you didn't request this, please ignore this email</li>
                            <li>Contact support if you have concerns</li>
                        </ul>
                    </div>

                    <p>Best regards,<br>{settings.APP_NAME} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply.</p>
                    <p>© 2024 {settings.APP_NAME}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
{settings.APP_NAME} - Password Reset

Hello {user_name},

You requested to reset your password. Use the OTP code below:

OTP: {otp}

This OTP is valid for 10 minutes.

Security Notice:
- Never share this OTP with anyone
- If you didn't request this, please ignore this email

Best regards,
{settings.APP_NAME} Team
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_welcome_email(self, to_email: str, user_name: str, temporary_password: str) -> dict:
        """
        Send welcome email to new user.

        Args:
            to_email: Recipient email address
            user_name: User's name
            temporary_password: Temporary password for first login

        Returns:
            dict: Email sending result
        """
        subject = f"Welcome to {settings.APP_NAME}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .credentials {{ background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to {settings.APP_NAME}!</h1>
                </div>
                <div class="content">
                    <p>Hello {user_name},</p>
                    <p>Your account has been created successfully. Here are your login credentials:</p>

                    <div class="credentials">
                        <p><strong>Email:</strong> {to_email}</p>
                        <p><strong>Temporary Password:</strong> {temporary_password}</p>
                    </div>

                    <p>⚠️ <strong>Important:</strong> Please change your password after your first login.</p>

                    <p>Best regards,<br>{settings.APP_NAME} Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 {settings.APP_NAME}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(to_email, subject, html_content)


# Global email service instance
email_service = EmailService()
