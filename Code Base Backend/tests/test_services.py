"""Unit tests for business logic services (no DB required for most)."""

import pytest
from app.services.triage import TriageService


class TestTriageServiceMock:
    """Test the mock triage (rule-based fallback, no Groq API)."""

    def setup_method(self):
        self.service = TriageService()  # GROQ_API_KEY="" → no client

    def test_critical_keywords(self):
        result = self.service._mock_triage("chest pain radiating to left arm")
        assert result["priority"] == 1
        assert result["priority_label"] == "L1 - Critical"

    def test_emergent_keywords(self):
        result = self.service._mock_triage("severe bleeding from wound")
        assert result["priority"] == 2
        assert result["priority_label"] == "L2 - Emergent"

    def test_urgent_keywords(self):
        result = self.service._mock_triage("fever and vomiting since morning")
        assert result["priority"] == 3

    def test_non_urgent_keywords(self):
        result = self.service._mock_triage("mild cold and cough")
        assert result["priority"] == 4
        assert result["priority_label"] == "L4 - Non-Urgent"

    def test_spo2_override(self):
        """Critical SpO2 should override keyword-based priority to L1."""
        result = self.service._mock_triage(
            "mild cold",
            vitals={"spo2": 85},
        )
        assert result["priority"] == 1
        assert result["priority_label"] == "L1 - Critical"
