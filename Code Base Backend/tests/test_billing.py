"""Tests for billing service and routes — invoice generation, amount calculation."""

import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient


class TestInvoiceAmountCalculation:
    """Pure function: calculate_invoice_amount."""

    def test_base_only_no_overage(self):
        from app.services.billing import calculate_invoice_amount
        from unittest.mock import MagicMock

        plan = MagicMock()
        plan.base_price = Decimal("9999")
        plan.price_per_extra_user = Decimal("299")
        plan.price_per_extra_bed = Decimal("499")
        plan.included_users = 10
        plan.included_beds = 20

        usage = MagicMock()
        usage.active_users = 5
        usage.total_beds = 10

        result = calculate_invoice_amount(plan, usage)
        assert result["base_amount"] == Decimal("9999")
        assert result["user_amount"] == Decimal("0")
        assert result["bed_amount"] == Decimal("0")
        assert result["subtotal"] == Decimal("9999")
        assert result["tax_rate"] == Decimal("18")
        assert result["total_amount"] == Decimal("9999") + (Decimal("9999") * Decimal("18") / Decimal("100")).quantize(Decimal("0.01"))

    def test_with_extra_users_and_beds(self):
        from app.services.billing import calculate_invoice_amount
        from unittest.mock import MagicMock

        plan = MagicMock()
        plan.base_price = Decimal("9999")
        plan.price_per_extra_user = Decimal("299")
        plan.price_per_extra_bed = Decimal("499")
        plan.included_users = 10
        plan.included_beds = 20

        usage = MagicMock()
        usage.active_users = 15  # 5 extra
        usage.total_beds = 25   # 5 extra

        result = calculate_invoice_amount(plan, usage)
        expected_user_amount = Decimal("299") * 5
        expected_bed_amount = Decimal("499") * 5
        assert result["user_amount"] == expected_user_amount
        assert result["bed_amount"] == expected_bed_amount
        subtotal = Decimal("9999") + expected_user_amount + expected_bed_amount
        assert result["subtotal"] == subtotal
        assert len(result["line_items"]) == 3  # base + users + beds

    def test_unlimited_plan_no_overage(self):
        from app.services.billing import calculate_invoice_amount
        from unittest.mock import MagicMock

        plan = MagicMock()
        plan.base_price = Decimal("59999")
        plan.price_per_extra_user = Decimal("199")
        plan.price_per_extra_bed = Decimal("299")
        plan.included_users = 0   # unlimited
        plan.included_beds = 0

        usage = MagicMock()
        usage.active_users = 500
        usage.total_beds = 200

        result = calculate_invoice_amount(plan, usage)
        # included_users=0 means unlimited, so active_users=included_users, no overage
        assert result["user_amount"] == Decimal("0")
        assert result["bed_amount"] == Decimal("0")

    def test_zero_usage(self):
        from app.services.billing import calculate_invoice_amount
        from unittest.mock import MagicMock

        plan = MagicMock()
        plan.base_price = Decimal("9999")
        plan.price_per_extra_user = Decimal("299")
        plan.price_per_extra_bed = Decimal("499")
        plan.included_users = 10
        plan.included_beds = 20

        usage = MagicMock()
        usage.active_users = 0
        usage.total_beds = 0

        result = calculate_invoice_amount(plan, usage)
        assert result["user_amount"] == Decimal("0")
        assert result["bed_amount"] == Decimal("0")
        assert result["subtotal"] == Decimal("9999")

    def test_gst_18_percent(self):
        from app.services.billing import calculate_invoice_amount
        from unittest.mock import MagicMock

        plan = MagicMock()
        plan.base_price = Decimal("10000")
        plan.price_per_extra_user = Decimal("0")
        plan.price_per_extra_bed = Decimal("0")
        plan.included_users = 100
        plan.included_beds = 100

        usage = MagicMock()
        usage.active_users = 1
        usage.total_beds = 1

        result = calculate_invoice_amount(plan, usage)
        assert result["tax_amount"] == Decimal("1800.00")
        assert result["total_amount"] == Decimal("11800.00")


class TestBillingRoutes:
    """Hospital admin billing routes."""

    async def test_get_current_billing(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/billing/current", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "invoices" in data
        assert "outstanding_amount" in data

    async def test_get_invoices_empty(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/billing/invoices", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json()["data"], list)

    async def test_get_invoice_not_found(self, client: AsyncClient, admin_headers):
        resp = await client.get(f"/api/v1/billing/invoices/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code == 404

    async def test_billing_forbidden_for_nurse(self, client: AsyncClient, nurse_headers):
        resp = await client.get("/api/v1/billing/current", headers=nurse_headers)
        assert resp.status_code == 403

    async def test_billing_forbidden_for_doctor(self, client: AsyncClient, doctor_headers):
        resp = await client.get("/api/v1/billing/invoices", headers=doctor_headers)
        assert resp.status_code == 403


class TestPlatformBillingRoutes:
    """Platform admin billing routes."""

    async def test_billing_overview(self, client: AsyncClient, platform_headers):
        resp = await client.get("/api/v1/platform/billing/overview", headers=platform_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "total_revenue" in data
        assert "outstanding_amount" in data
        assert "paid_invoices" in data

    async def test_generate_invoices(self, client: AsyncClient, platform_headers):
        resp = await client.post("/api/v1/platform/billing/generate-invoices", headers=platform_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "generated" in data
        assert "skipped" in data

    async def test_generate_invoices_forbidden_for_admin(self, client: AsyncClient, admin_headers):
        resp = await client.post("/api/v1/platform/billing/generate-invoices", headers=admin_headers)
        assert resp.status_code == 403


class TestRazorpayWebhook:
    """POST /api/v1/billing/webhook/razorpay"""

    async def test_webhook_missing_fields(self, client: AsyncClient):
        resp = await client.post("/api/v1/billing/webhook/razorpay", json={})
        assert resp.status_code == 400

    async def test_webhook_invoice_not_found(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/billing/webhook/razorpay",
            json={
                "razorpay_order_id": "order_nonexistent",
                "razorpay_payment_id": "pay_123",
                "razorpay_signature": "sig_123",
            },
        )
        assert resp.status_code == 404
