"""Tests for /admin router endpoints."""

import pytest
from bson import ObjectId


class TestAdminCheck:
    """GET /admin/check"""

    def test_unauthenticated_returns_401(self, client):
        """Request without a token is rejected."""
        response = client.get("/admin/check")
        assert response.status_code == 401

    def test_non_admin_returns_false(self, client, auth_headers):
        """Regular user receives is_admin=false."""
        response = client.get("/admin/check", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {"is_admin": False}

    def test_admin_user_returns_true(self, client, admin_headers):
        """User whose email matches ADMIN_EMAIL receives is_admin=true."""
        response = client.get("/admin/check", headers=admin_headers)
        assert response.status_code == 200
        assert response.json() == {"is_admin": True}

    def test_guest_user_returns_false(self, client, guest_headers):
        """Guest user receives is_admin=false."""
        response = client.get("/admin/check", headers=guest_headers)
        assert response.status_code == 200
        assert response.json() == {"is_admin": False}


class TestAdminListQuestions:
    """GET /admin/questions"""

    def test_non_admin_returns_403(self, client, auth_headers):
        """Regular user is forbidden."""
        response = client.get("/admin/questions", headers=auth_headers)
        assert response.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        """Request without a token is rejected."""
        response = client.get("/admin/questions")
        assert response.status_code == 401

    def test_empty_collection(self, client, admin_headers):
        """Returns empty list and zero total when no questions exist."""
        response = client.get("/admin/questions", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["questions"] == []
        assert data["total"] == 0

    def test_returns_all_seeded_questions(self, client, admin_headers, seeded_questions):
        """All seeded questions are returned without filters."""
        response = client.get("/admin/questions", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == len(seeded_questions)
        assert len(data["questions"]) == len(seeded_questions)

    def test_ids_are_strings(self, client, admin_headers, seeded_questions):
        """MongoDB ObjectIds are serialised as strings."""
        response = client.get("/admin/questions", headers=admin_headers)
        for q in response.json()["questions"]:
            assert isinstance(q["_id"], str)

    def test_filter_by_domain(self, client, admin_headers, seeded_questions):
        """domain filter returns only questions from that domain."""
        response = client.get(
            "/admin/questions",
            params={"domain": "Matematyka Finansowa"},
            headers=admin_headers,
        )
        data = response.json()
        assert data["total"] == 2
        for q in data["questions"]:
            assert q["domain"] == "Matematyka Finansowa"

    def test_filter_by_search(self, client, admin_headers, seeded_questions):
        """search param performs case-insensitive regex against question text."""
        response = client.get(
            "/admin/questions",
            params={"search": "pytanie 2"},
            headers=admin_headers,
        )
        data = response.json()
        assert data["total"] == 1
        assert "Pytanie 2" in data["questions"][0]["question"]

    def test_pagination_page_two(self, client, admin_headers, seeded_questions):
        """Page 2 with n=2 returns the remaining question."""
        response = client.get(
            "/admin/questions",
            params={"n": 2, "page": 2},
            headers=admin_headers,
        )
        data = response.json()
        assert data["total"] == 3
        assert len(data["questions"]) == 1

    def test_pagination_beyond_last_page(self, client, admin_headers, seeded_questions):
        """Page beyond the last returns empty list but correct total."""
        response = client.get(
            "/admin/questions",
            params={"n": 10, "page": 99},
            headers=admin_headers,
        )
        data = response.json()
        assert data["total"] == 3
        assert data["questions"] == []


class TestAdminUpdateQuestion:
    """PATCH /admin/questions/{id}"""

    def test_non_admin_returns_403(self, client, auth_headers, seeded_questions, mongo_db):
        """Regular user is forbidden."""
        q_id = str(mongo_db["questions"].find_one()["_id"])
        response = client.patch(
            f"/admin/questions/{q_id}",
            json={"question": "Updated"},
            headers=auth_headers,
        )
        assert response.status_code == 403

    def test_updates_question_fields(self, client, admin_headers, seeded_questions, mongo_db):
        """Admin can update a question's text and answer fields."""
        q = mongo_db["questions"].find_one({"question": "Pytanie 1"})
        q_id = str(q["_id"])

        response = client.patch(
            f"/admin/questions/{q_id}",
            json={"question": "Zaktualizowane pytanie", "correct_answer": "B"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["question"] == "Zaktualizowane pytanie"
        assert data["correct_answer"] == "B"

    def test_persists_change_in_db(self, client, admin_headers, seeded_questions, mongo_db):
        """The update is reflected in the database."""
        q = mongo_db["questions"].find_one({"question": "Pytanie 1"})
        q_id = str(q["_id"])

        client.patch(
            f"/admin/questions/{q_id}",
            json={"topic": "Nowy Temat"},
            headers=admin_headers,
        )
        updated = mongo_db["questions"].find_one({"_id": q["_id"]})
        assert updated["topic"] == "Nowy Temat"

    def test_invalid_id_returns_422(self, client, admin_headers):
        """Non-ObjectId string returns 422."""
        response = client.patch(
            "/admin/questions/not-an-id",
            json={"question": "x"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_nonexistent_id_returns_404(self, client, admin_headers):
        """Unknown but valid ObjectId returns 404."""
        fake_id = str(ObjectId())
        response = client.patch(
            f"/admin/questions/{fake_id}",
            json={"question": "x"},
            headers=admin_headers,
        )
        assert response.status_code == 404

    def test_empty_body_returns_422(self, client, admin_headers, seeded_questions, mongo_db):
        """Empty update body is rejected with 422."""
        q_id = str(mongo_db["questions"].find_one()["_id"])
        response = client.patch(
            f"/admin/questions/{q_id}",
            json={},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_id_field_cannot_be_overwritten(self, client, admin_headers, seeded_questions, mongo_db):
        """Passing _id in the body is silently ignored and does not raise."""
        q = mongo_db["questions"].find_one()
        original_id = q["_id"]
        q_id = str(original_id)

        response = client.patch(
            f"/admin/questions/{q_id}",
            json={"_id": str(ObjectId()), "question": "Safe update"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        still_there = mongo_db["questions"].find_one({"_id": original_id})
        assert still_there is not None


class TestAdminListReports:
    """GET /admin/reports"""

    def test_non_admin_returns_403(self, client, auth_headers):
        """Regular user is forbidden."""
        response = client.get("/admin/reports", headers=auth_headers)
        assert response.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        """Request without a token is rejected."""
        response = client.get("/admin/reports")
        assert response.status_code == 401

    def test_empty_collection(self, client, admin_headers):
        """Returns empty list when no reports exist."""
        response = client.get("/admin/reports", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["reports"] == []
        assert data["total"] == 0

    def test_returns_all_reports(self, client, admin_headers, seeded_reports):
        """All reports are returned without filter."""
        response = client.get("/admin/reports", headers=admin_headers)
        data = response.json()
        assert data["total"] == 2

    def test_filter_unresolved(self, client, admin_headers, seeded_reports):
        """resolved=false returns only unresolved reports."""
        response = client.get(
            "/admin/reports",
            params={"resolved": "false"},
            headers=admin_headers,
        )
        data = response.json()
        assert data["total"] == 1
        assert data["reports"][0]["resolved"] is False

    def test_filter_resolved(self, client, admin_headers, seeded_reports):
        """resolved=true returns only resolved reports."""
        response = client.get(
            "/admin/reports",
            params={"resolved": "true"},
            headers=admin_headers,
        )
        data = response.json()
        assert data["total"] == 1
        assert data["reports"][0]["resolved"] is True

    def test_ids_are_strings(self, client, admin_headers, seeded_reports):
        """MongoDB ObjectIds are serialised as strings."""
        response = client.get("/admin/reports", headers=admin_headers)
        for r in response.json()["reports"]:
            assert isinstance(r["_id"], str)


class TestAdminUpdateReport:
    """PATCH /admin/reports/{id}"""

    def test_non_admin_returns_403(self, client, auth_headers, seeded_reports):
        """Regular user is forbidden."""
        r_id = str(seeded_reports[0]["_id"])
        response = client.patch(
            f"/admin/reports/{r_id}",
            json={"resolved": True},
            headers=auth_headers,
        )
        assert response.status_code == 403

    def test_resolve_report(self, client, admin_headers, seeded_reports, mongo_db):
        """Admin can mark a report as resolved with an optional note."""
        r_id = str(seeded_reports[0]["_id"])
        response = client.patch(
            f"/admin/reports/{r_id}",
            json={"resolved": True, "admin_note": "Poprawione"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["resolved"] is True
        assert data["admin_note"] == "Poprawione"

    def test_resolve_sets_resolved_at(self, client, admin_headers, seeded_reports, mongo_db):
        """Resolving a report populates the resolved_at timestamp."""
        r_id = str(seeded_reports[0]["_id"])
        client.patch(
            f"/admin/reports/{r_id}",
            json={"resolved": True},
            headers=admin_headers,
        )
        updated = mongo_db["reports"].find_one({"_id": seeded_reports[0]["_id"]})
        assert updated["resolved_at"] is not None

    def test_invalid_id_returns_422(self, client, admin_headers):
        """Non-ObjectId string returns 422."""
        response = client.patch(
            "/admin/reports/not-an-id",
            json={"resolved": True},
            headers=admin_headers,
        )
        assert response.status_code == 422

    def test_nonexistent_id_returns_404(self, client, admin_headers):
        """Unknown but valid ObjectId returns 404."""
        fake_id = str(ObjectId())
        response = client.patch(
            f"/admin/reports/{fake_id}",
            json={"resolved": True},
            headers=admin_headers,
        )
        assert response.status_code == 404


class TestAdminDeleteReport:
    """DELETE /admin/reports/{id}"""

    def test_non_admin_returns_403(self, client, auth_headers, seeded_reports):
        """Regular user is forbidden."""
        r_id = str(seeded_reports[0]["_id"])
        response = client.delete(f"/admin/reports/{r_id}", headers=auth_headers)
        assert response.status_code == 403

    def test_deletes_report(self, client, admin_headers, seeded_reports, mongo_db):
        """Admin can permanently delete a report."""
        r_id = str(seeded_reports[0]["_id"])
        response = client.delete(f"/admin/reports/{r_id}", headers=admin_headers)
        assert response.status_code == 200
        assert mongo_db["reports"].find_one({"_id": seeded_reports[0]["_id"]}) is None

    def test_invalid_id_returns_422(self, client, admin_headers):
        """Non-ObjectId string returns 422."""
        response = client.delete("/admin/reports/not-an-id", headers=admin_headers)
        assert response.status_code == 422

    def test_nonexistent_id_returns_404(self, client, admin_headers):
        """Unknown but valid ObjectId returns 404."""
        fake_id = str(ObjectId())
        response = client.delete(f"/admin/reports/{fake_id}", headers=admin_headers)
        assert response.status_code == 404

    def test_double_delete_returns_404(self, client, admin_headers, seeded_reports):
        """Deleting an already-deleted report returns 404."""
        r_id = str(seeded_reports[0]["_id"])
        client.delete(f"/admin/reports/{r_id}", headers=admin_headers)
        response = client.delete(f"/admin/reports/{r_id}", headers=admin_headers)
        assert response.status_code == 404
