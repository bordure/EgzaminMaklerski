"""Tests for /auth router endpoints."""

from unittest.mock import AsyncMock, patch
import pytest
import routers.auth as auth_module


class TestGetGoogleUrl:
    """GET /auth/google/url"""

    def test_returns_auth_url(self, client):
        """Response contains a Google OAuth URL."""
        response = client.get("/auth/google/url")
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "accounts.google.com" in data["auth_url"]

    def test_auth_url_contains_client_id(self, client):
        """URL encodes the configured client ID."""
        response = client.get("/auth/google/url")
        assert auth_module.GOOGLE_CLIENT_ID in response.json()["auth_url"]


class TestGuestLogin:
    """POST /auth/guest"""

    def test_returns_token_pair(self, client):
        """Guest login returns access_token, refresh_token and token_type."""
        response = client.post("/auth/guest")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_access_token_is_decodable(self, client):
        """The returned access token decodes without error."""
        response = client.post("/auth/guest")
        token = response.json()["access_token"]
        payload = auth_module.verify_jwt_token(token)
        assert payload.get("guest") is True

    def test_expires_in_is_positive(self, client):
        """expires_in is a positive integer."""
        response = client.post("/auth/guest")
        assert response.json()["expires_in"] > 0


class TestRefreshToken:
    """POST /auth/refresh"""

    def test_valid_refresh_token_returns_new_pair(self, client):
        """Supplying a valid refresh token returns a new token pair."""
        guest = client.post("/auth/guest").json()
        response = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {guest['refresh_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_access_token_rejected_as_refresh(self, client):
        """Passing an access token as a refresh token is rejected."""
        guest = client.post("/auth/guest").json()
        response = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {guest['access_token']}"},
        )
        assert response.status_code == 401

    def test_missing_authorization_returns_401(self, client):
        """No Authorization header returns 401."""
        response = client.post("/auth/refresh")
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client):
        """A malformed token returns 401."""
        response = client.post(
            "/auth/refresh",
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        assert response.status_code == 401


class TestGetMe:
    """GET /auth/me"""

    def test_authenticated_user_returns_payload(self, client, auth_headers):
        """Authenticated request returns the user payload."""
        response = client.get("/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "user-001"

    def test_guest_user_returns_payload(self, client, guest_headers):
        """Guest token is also accepted."""
        response = client.get("/auth/me", headers=guest_headers)
        assert response.status_code == 200
        assert response.json()["guest"] is True

    def test_no_token_returns_401(self, client):
        """No token returns 401."""
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client):
        """Invalid token returns 401."""
        response = client.get("/auth/me", headers={"Authorization": "Bearer garbage"})
        assert response.status_code == 401


class TestLogout:
    """POST /auth/logout"""

    def test_authenticated_logout_succeeds(self, client, auth_headers):
        """Authenticated user can log out."""
        response = client.post("/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"

    def test_unauthenticated_logout_returns_401(self, client):
        """Unauthenticated logout returns 401."""
        response = client.post("/auth/logout")
        assert response.status_code == 401
