"""
AWS Lambda Handler for ER Command Center API

This file contains the Lambda handler that wraps the FastAPI application
using Mangum for AWS Lambda compatibility.
"""

from mangum import Mangum
from app.main import app

# Create Lambda handler
handler = Mangum(app, lifespan="off")


# Alternative handler with custom event handling
def lambda_handler(event, context):
    """
    AWS Lambda handler function.

    This handler wraps the FastAPI application and handles:
    - API Gateway HTTP API (v2) events
    - API Gateway REST API (v1) events
    - Application Load Balancer events
    """
    # Log request for debugging
    print(f"Event: {event.get('requestContext', {}).get('http', {}).get('method', 'UNKNOWN')} "
          f"{event.get('rawPath', event.get('path', '/'))}")

    # Handle warmup events
    if event.get('source') == 'serverless-plugin-warmup':
        print("Warmup event received")
        return {"statusCode": 200, "body": "Warmed up"}

    # Handle health check for ALB
    if event.get('path') == '/health' or event.get('rawPath') == '/health':
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": '{"status": "healthy"}'
        }

    # Process through Mangum
    return handler(event, context)
