"""Tests for /reports router endpoints."""

import pytest


class TestSubmitReport:
    """POST /reports"""

    def test_unauthenticated_returns_401(self, client):
        """Request without a token is rejected."""
        response = client.post(
            "/reports",
            json={
                "question_id": "507f1f77bcf86cd799439011",
                "question_text": "Pytanie testowe",
                "reason": "typo",
            },
        )
        assert response.status_code == 401

    def test_authenticated_user_can_submit(self, client, auth_headers):
        """Authenticated non-guest user can submit a report."""
        response = client.post(
            "/reports",
            json={
                "question_id": "507f1f77bcf86cd799439011",
                "question_text": "Pytanie testowe",
                "reason": "typo",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201

    def test_guest_user_cannot_submit(self, client, guest_headers):
        """Guest users are forbidden from submitting reports."""
        response = client.post(
            "/reports",
            json={
                "question_id": "507f1f77bcf86cd799439011",
                "question_text": "Pytanie testowe",
                "reason": "wrong_answer",
            },
            headers=guest_headers,
        )
        assert response.status_code == 403

    def test_report_is_stored_in_db(self, client, auth_headers, mongo_db):
        """Submitted report appears in the reports collection."""
        client.post(
            "/reports",
            json={
                "question_id": "507f1f77bcf86cd799439011",
                "question_text": "Pytanie testowe",
                "reason": "other",
                "description": "Nie zgadzam sie z treswia",
            },
            headers=auth_headers,
        )
        doc = mongo_db["reports"].find_one({"reason": "other"})
        assert doc is not None
        assert doc["question_text"] == "Pytanie testowe"
        assert doc["resolved"] is False

    def test_stores_reporter_email(self, client, auth_headers, mongo_db):
        """The authenticated user's email is stored as reported_by."""
        client.post(
            "/reports",
            json={
                "question_id": "abc123",
                "question_text": "Q",
                "reason": "typo",
            },
            headers=auth_headers,
        )
        doc = mongo_db["reports"].find_one({"reason": "typo"})
        assert doc["reported_by"] == "test@example.com"

    def test_description_is_optional(self, client, auth_headers):
        """Report without description field is accepted."""
        response = client.post(
            "/reports",
            json={
                "question_id": "abc123",
                "question_text": "Q",
                "reason": "other",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201

    def test_description_stored_when_provided(self, client, auth_headers, mongo_db):
        """Description is persisted when provided."""
        client.post(
            "/reports",
            json={
                "question_id": "abc123",
                "question_text": "Q",
                "reason": "typo",
                "description": "Blad ortograficzny",
            },
            headers=auth_headers,
        )
        doc = mongo_db["reports"].find_one({"description": "Blad ortograficzny"})
        assert doc is not None

    def test_invalid_reason_returns_422(self, client, auth_headers):
        """Reason not in the allowed enum is rejected with 422."""
        response = client.post(
            "/reports",
            json={
                "question_id": "abc123",
                "question_text": "Q",
                "reason": "not_a_valid_reason",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_missing_question_id_returns_422(self, client, auth_headers):
        """Missing required question_id field returns 422."""
        response = client.post(
            "/reports",
            json={"question_text": "Q", "reason": "typo"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_missing_reason_returns_422(self, client, auth_headers):
        """Missing required reason field returns 422."""
        response = client.post(
            "/reports",
            json={"question_id": "abc", "question_text": "Q"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_all_valid_reasons_accepted(self, client, auth_headers):
        """Each allowed reason value returns 201."""
        for reason in ("typo", "wrong_answer", "other"):
            response = client.post(
                "/reports",
                json={
                    "question_id": "abc123",
                    "question_text": "Q",
                    "reason": reason,
                },
                headers=auth_headers,
            )
            assert response.status_code == 201, f"reason={reason} unexpectedly rejected"

    def test_resolved_defaults_to_false(self, client, auth_headers, mongo_db):
        """A freshly submitted report has resolved=False."""
        client.post(
            "/reports",
            json={
                "question_id": "defaultcheck",
                "question_text": "Q",
                "reason": "typo",
            },
            headers=auth_headers,
        )
        doc = mongo_db["reports"].find_one({"question_id": "defaultcheck"})
        assert doc["resolved"] is False
        assert doc["resolved_at"] is None
        assert doc["admin_note"] is None
