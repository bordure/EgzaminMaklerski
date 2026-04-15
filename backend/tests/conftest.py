"""Shared pytest fixtures for all backend router tests."""

import sys
import os
from datetime import timedelta
from unittest.mock import MagicMock, patch

import mongomock
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-tests-only-padding")

from main import app
import routers.auth as auth_module


@pytest.fixture()
def mongo_db():
    """In-memory MongoDB substitute via mongomock."""
    client = mongomock.MongoClient()
    return client["exam_db"]


@pytest.fixture()
def client(mongo_db):
    """TestClient with the in-memory DB injected into app state."""
    app.state.db = mongo_db
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def auth_token(mongo_db):
    """Return a valid access token for a non-guest user."""
    user = {"id": "user-001", "email": "test@example.com", "guest": False}
    pair = auth_module.create_token_pair(user)
    return pair.access_token


@pytest.fixture()
def guest_token(mongo_db):
    """Return a valid access token for a guest user."""
    user = {"id": "guest-001", "guest": True}
    pair = auth_module.create_token_pair(user)
    return pair.access_token


@pytest.fixture()
def auth_headers(auth_token):
    """Authorization headers for a non-guest user."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture()
def guest_headers(guest_token):
    """Authorization headers for a guest user."""
    return {"Authorization": f"Bearer {guest_token}"}


@pytest.fixture()
def seeded_questions(mongo_db):
    """Insert a small set of pre-classified questions into the test DB."""
    questions = [
        {
            "question": "Pytanie 1",
            "option_A": "A", "option_B": "B", "option_C": "C", "option_D": "D",
            "correct_answer": "A",
            "domain": "Matematyka Finansowa",
            "section": "Analiza Portfelowa",
            "topic": "Modele rynku (CML, Sharpe, CAPM)",
            "exam_date": "10.10.2022",
        },
        {
            "question": "Pytanie 2",
            "option_A": "A", "option_B": "B", "option_C": "C", "option_D": "D",
            "correct_answer": "B",
            "domain": "Prawo i Etyka",
            "section": "Prawo - Ustawy",
            "topic": "Kodeks Cywilny",
            "exam_date": "12.10.2025",
        },
        {
            "question": "Pytanie 3",
            "option_A": "A", "option_B": "B", "option_C": "C", "option_D": "D",
            "correct_answer": "C",
            "domain": "Matematyka Finansowa",
            "section": "Analiza Portfelowa",
            "topic": "Modele rynku (CML, Sharpe, CAPM)",
            "exam_date": "10.10.2022",
        },
    ]
    mongo_db["questions"].insert_many(questions)
    return questions
