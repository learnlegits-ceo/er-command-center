import json
import time
from typing import Optional, Dict, Any, List
from groq import Groq
from app.core.config import settings


class TriageService:
    """AI Triage service using Groq LLM."""

    TRIAGE_PROMPT = """You are an experienced emergency room triage nurse. Based on the patient information provided, assess the patient's CURRENT condition and assign a priority level.

Priority Levels (L1-L4):
1 - L1 CRITICAL (Red): Life-threatening, requires immediate intervention - resuscitation needed
2 - L2 EMERGENT (Orange): Potentially life-threatening, needs urgent care within 10 minutes
3 - L3 URGENT (Yellow): Serious but stable, can wait up to 30-60 minutes
4 - L4 NON-URGENT (Green): Minor conditions, can wait up to 2 hours

Patient Information:
- Chief Complaint: {complaint}
- Age: {age}
- Gender: {gender}
- Vital Signs: {vitals}
- Medical History: {history}
- Current Treatments/Prescriptions: {treatments}

IMPORTANT: Factor in any ongoing treatments or prescribed medications when assessing the patient's current condition. If treatment has been started (e.g., supplemental oxygen for low SpO2, medication for pain), reflect that in your reasoning and adjust the priority accordingly. Your reasoning should describe the patient's current status including the effect of any treatments.

Respond in JSON format with the following structure:
{{
    "priority": <1-4>,
    "priority_label": "<L1 - Critical|L2 - Emergent|L3 - Urgent|L4 - Non-Urgent>",
    "priority_color": "<red|orange|yellow|green>",
    "reasoning": "<brief explanation of your CURRENT assessment, factoring in treatments>",
    "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
    "suggested_department": "<suggested department/specialty>",
    "estimated_wait_time": "<estimated wait time>",
    "confidence": <0.0-1.0>
}}

Be conservative - when in doubt, assign a higher priority (lower number). Consider vital signs thresholds:
- Critical BP: <90/60 or >180/120
- Critical HR: <50 or >150
- Critical SpO2: <90%
- Critical Temp: <95°F or >104°F
"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.client = Groq(api_key=self.api_key) if self.api_key else None
        self.model = settings.GROQ_MODEL
        self.temperature = settings.GROQ_TEMPERATURE
        self.max_tokens = settings.GROQ_MAX_TOKENS

    async def run_triage(
        self,
        complaint: str,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        vitals: Optional[Dict[str, Any]] = None,
        history: Optional[str] = None,
        treatments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Run AI triage on patient data."""
        if not self.client:
            # Return mock data if no API key
            return self._mock_triage(complaint, vitals)

        # Format vitals string
        vitals_str = "Not provided"
        if vitals:
            vitals_parts = []
            if vitals.get("hr"):
                vitals_parts.append(f"HR: {vitals['hr']} bpm")
            if vitals.get("bp"):
                vitals_parts.append(f"BP: {vitals['bp']} mmHg")
            if vitals.get("spo2"):
                vitals_parts.append(f"SpO2: {vitals['spo2']}%")
            if vitals.get("temp"):
                vitals_parts.append(f"Temp: {vitals['temp']}°F")
            if vitals.get("respiratory_rate"):
                vitals_parts.append(f"RR: {vitals['respiratory_rate']} breaths/min")
            vitals_str = ", ".join(vitals_parts) if vitals_parts else "Not provided"

        # Format treatments string
        treatments_str = "None"
        if treatments and len(treatments) > 0:
            treatments_str = "; ".join(treatments)

        # Build prompt
        prompt = self.TRIAGE_PROMPT.format(
            complaint=complaint or "Not specified",
            age=age if age else "Not specified",
            gender=gender if gender else "Not specified",
            vitals=vitals_str,
            history=history if history else "None reported",
            treatments=treatments_str
        )

        start_time = time.time()

        try:
            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a medical triage AI assistant. Always respond with valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )

            processing_time = int((time.time() - start_time) * 1000)

            # Parse response
            content = response.choices[0].message.content
            result = json.loads(content)

            # Add metadata
            result["groq_model"] = self.model
            result["groq_request_id"] = response.id if hasattr(response, 'id') else None
            result["prompt_tokens"] = response.usage.prompt_tokens if response.usage else None
            result["completion_tokens"] = response.usage.completion_tokens if response.usage else None
            result["total_tokens"] = response.usage.total_tokens if response.usage else None
            result["processing_time_ms"] = processing_time
            result["temperature"] = self.temperature

            return result

        except Exception as e:
            print(f"Groq API error: {e}")
            # Return mock triage on error
            return self._mock_triage(complaint, vitals)

    def _mock_triage(
        self,
        complaint: str,
        vitals: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate mock triage result for testing."""
        # Simple rule-based mock using L1-L4 scale
        priority = 3
        priority_label = "L3 - Urgent"
        priority_color = "yellow"

        complaint_lower = complaint.lower() if complaint else ""

        # Critical keywords - L1
        if any(word in complaint_lower for word in ["chest pain", "heart attack", "stroke", "unconscious", "not breathing", "cardiac arrest"]):
            priority = 1
            priority_label = "L1 - Critical"
            priority_color = "red"
        # Emergent keywords - L2
        elif any(word in complaint_lower for word in ["severe bleeding", "head injury", "difficulty breathing", "severe pain", "fracture"]):
            priority = 2
            priority_label = "L2 - Emergent"
            priority_color = "orange"
        # Urgent keywords - L3
        elif any(word in complaint_lower for word in ["fever", "vomiting", "abdominal pain", "infection", "moderate pain"]):
            priority = 3
            priority_label = "L3 - Urgent"
            priority_color = "yellow"
        # Non-urgent keywords - L4
        elif any(word in complaint_lower for word in ["cold", "cough", "minor cut", "rash", "follow-up", "prescription refill"]):
            priority = 4
            priority_label = "L4 - Non-Urgent"
            priority_color = "green"

        # Check vitals for critical values - override to L1
        if vitals:
            spo2 = vitals.get("spo2")
            if spo2 and float(spo2) < 90:
                priority = 1
                priority_label = "L1 - Critical"
                priority_color = "red"

        return {
            "priority": priority,
            "priority_label": priority_label,
            "priority_color": priority_color,
            "reasoning": f"Based on chief complaint: {complaint}. Assessment performed using rule-based fallback.",
            "recommendations": ["Clinical assessment required", "Monitor vitals"],
            "suggested_department": "Emergency",
            "estimated_wait_time": ["Immediate", "10 minutes", "30-60 minutes", "1-2 hours"][priority - 1],
            "confidence": 0.75,
            "groq_model": "mock",
            "processing_time_ms": 50
        }

    async def extract_vitals_from_image(
        self,
        image_base64: str
    ) -> Dict[str, Any]:
        """Extract vitals from image using Groq Vision."""
        if not self.client:
            return self._mock_ocr_result()

        try:
            response = self.client.chat.completions.create(
                model=settings.GROQ_VISION_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Extract vital signs from this medical monitor image.
                                Return JSON with: {"hr": "heart rate", "bp": "blood pressure", "spo2": "oxygen saturation", "temp": "temperature"}
                                Include confidence scores (0-1) for each value extracted.
                                If a value cannot be read, set it to null."""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                temperature=0.1,
                max_tokens=500,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            return {
                "extracted": result.get("extracted", result),
                "confidence": result.get("confidence", {}),
                "rawText": result.get("rawText", "")
            }

        except Exception as e:
            print(f"Groq Vision API error: {e}")
            return self._mock_ocr_result()

    def _mock_ocr_result(self) -> Dict[str, Any]:
        """Mock OCR result for testing."""
        return {
            "extracted": {
                "hr": "78",
                "bp": "120/80",
                "spo2": "98",
                "temp": "98.6"
            },
            "confidence": {
                "hr": 0.9,
                "bp": 0.85,
                "spo2": 0.92,
                "temp": 0.88
            },
            "rawText": "HR: 78 bpm, BP: 120/80 mmHg, SpO2: 98%, Temp: 98.6°F"
        }
