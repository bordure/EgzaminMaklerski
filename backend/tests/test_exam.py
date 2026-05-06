"""Tests for /exam router endpoints."""

import pytest


class TestGetTopics:
    """GET /exam/topics"""

    def test_returns_empty_when_no_questions(self, client, auth_headers):
        """Empty collection returns an empty dict."""
        response = client.get("/exam/topics", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {}

    def test_returns_three_level_hierarchy(self, client, auth_headers, seeded_questions):
        """Seeded questions produce domain -> section -> [topics] structure."""
        response = client.get("/exam/topics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "Matematyka Finansowa" in data
        assert "Analiza Portfelowa" in data["Matematyka Finansowa"]
        assert "Modele rynku (CML, Sharpe, CAPM)" in data["Matematyka Finansowa"]["Analiza Portfelowa"]

    def test_topics_are_sorted(self, client, auth_headers, seeded_questions):
        """Topics within each section are returned in sorted order."""
        response = client.get("/exam/topics", headers=auth_headers)
        for domain, sections in response.json().items():
            for section, topics in sections.items():
                assert topics == sorted(topics)

    def test_requires_authentication(self, client):
        """Unauthenticated request returns 401."""
        response = client.get("/exam/topics")
        assert response.status_code == 401


class TestGetQuestions:
    """GET /exam/questions"""

    def test_returns_questions(self, client, auth_headers, seeded_questions):
        """Returns paginated questions and total count."""
        response = client.get("/exam/questions?n=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert "total" in data
        assert data["total"] == 3

    def test_filter_by_domain(self, client, auth_headers, seeded_questions):
        """Filtering by domain narrows results."""
        response = client.get(
            "/exam/questions?domain=Prawo+i+Etyka&n=10", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["questions"][0]["domain"] == "Prawo i Etyka"

    def test_filter_by_section(self, client, auth_headers, seeded_questions):
        """Filtering by section narrows results."""
        response = client.get(
            "/exam/questions?section=Analiza+Portfelowa&n=10", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["total"] == 2

    def test_filter_by_topic(self, client, auth_headers, seeded_questions):
        """Filtering by topic returns only matching questions."""
        response = client.get(
            "/exam/questions?topic=Kodeks+Cywilny&n=10", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["total"] == 1

    def test_filter_by_exam_date(self, client, auth_headers, seeded_questions):
        """Filtering by exam_date returns only questions from that date."""
        response = client.get(
            "/exam/questions?exam_date=10.10.2022&n=10", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["total"] == 2

    def test_no_match_returns_404(self, client, auth_headers, seeded_questions):
        """Filter with no matching questions returns 404."""
        response = client.get(
            "/exam/questions?domain=NonExistent&n=10", headers=auth_headers
        )
        assert response.status_code == 404

    def test_ids_are_stringified(self, client, auth_headers, seeded_questions):
        """MongoDB ObjectIds are serialised as strings."""
        response = client.get("/exam/questions?n=10", headers=auth_headers)
        for q in response.json()["questions"]:
            assert isinstance(q["_id"], str)

    def test_random_questions_flag(self, client, auth_headers, seeded_questions):
        """random_questions=true still returns valid questions."""
        response = client.get(
            "/exam/questions?n=2&random_questions=true", headers=auth_headers
        )
        assert response.status_code == 200
        assert len(response.json()["questions"]) == 2

    def test_n_capped_to_total(self, client, auth_headers, seeded_questions):
        """Requesting more than total available returns at most total."""
        response = client.get("/exam/questions?n=100", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()["questions"]) == 3

    def test_requires_authentication(self, client):
        """Unauthenticated request returns 401."""
        response = client.get("/exam/questions")
        assert response.status_code == 401


class TestGetQuestionsCount:
    """GET /exam/questions/count"""

    def test_returns_total_count(self, client, auth_headers, seeded_questions):
        """Returns the total count of all questions."""
        response = client.get("/exam/questions/count", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 3

    def test_filtered_count(self, client, auth_headers, seeded_questions):
        """Count respects domain filter."""
        response = client.get(
            "/exam/questions/count?domain=Matematyka+Finansowa", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["total"] == 2

    def test_zero_count_for_nonexistent_filter(self, client, auth_headers, seeded_questions):
        """Returns 0 for a filter that matches nothing."""
        response = client.get(
            "/exam/questions/count?topic=NonExistent", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_requires_authentication(self, client):
        """Unauthenticated request returns 401."""
        response = client.get("/exam/questions/count")
        assert response.status_code == 401


class TestGetExamDates:
    """GET /exam/exam_dates"""

    def test_returns_sorted_dates(self, client, auth_headers, seeded_questions):
        """Dates are returned sorted chronologically."""
        response = client.get("/exam/exam_dates", headers=auth_headers)
        assert response.status_code == 200
        dates = response.json()["exam_dates"]
        assert dates == sorted(dates, key=lambda d: d.split(".")[::-1])

    def test_returns_distinct_dates(self, client, auth_headers, seeded_questions):
        """Duplicate exam dates are deduplicated."""
        response = client.get("/exam/exam_dates", headers=auth_headers)
        dates = response.json()["exam_dates"]
        assert len(dates) == len(set(dates))

    def test_empty_collection_returns_empty_list(self, client, auth_headers):
        """Empty collection returns an empty list."""
        response = client.get("/exam/exam_dates", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["exam_dates"] == []

    def test_requires_authentication(self, client):
        """Unauthenticated request returns 401."""
        response = client.get("/exam/exam_dates")
        assert response.status_code == 401


class TestGetSubtopicCounts:
    """GET /exam/subtopic_counts"""

    def test_returns_counts_by_topic(self, client, auth_headers, seeded_questions):
        """Returns list of topic/count pairs."""
        response = client.get("/exam/subtopic_counts", headers=auth_headers)
        assert response.status_code == 200
        counts = response.json()["subtopic_counts"]
        assert isinstance(counts, list)
        ids = [c["_id"] for c in counts]
        assert "Modele rynku (CML, Sharpe, CAPM)" in ids
        assert "Kodeks Cywilny" in ids

    def test_counts_are_correct(self, client, auth_headers, seeded_questions):
        """The topic with 2 questions reports count=2."""
        response = client.get("/exam/subtopic_counts", headers=auth_headers)
        counts = {c["_id"]: c["count"] for c in response.json()["subtopic_counts"]}
        assert counts["Modele rynku (CML, Sharpe, CAPM)"] == 2
        assert counts["Kodeks Cywilny"] == 1

    def test_requires_authentication(self, client):
        """Unauthenticated request returns 401."""
        response = client.get("/exam/subtopic_counts")
        assert response.status_code == 401
