"""Tests for /notion router endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
import httpx


SAMPLE_PAGE = {
    "block-id-1": {
        "value": {
            "role": "reader",
            "value": {"id": "block-id-1", "type": "page", "content": []},
        }
    }
}


class TestGetNotionPage:
    """GET /notion/{page_id}"""

    def test_returns_page_data_on_success(self, client, auth_headers):
        """Successful upstream response is forwarded as JSON."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = SAMPLE_PAGE
        mock_response.raise_for_status = MagicMock()

        with patch("routers.notion.httpx.AsyncClient") as mock_client_cls:
            mock_async_client = AsyncMock()
            mock_async_client.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_async_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            response = client.get("/notion/248cf5e9d029808eb124f2913f1dc259", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == SAMPLE_PAGE

    def test_upstream_request_error_returns_502(self, client, auth_headers):
        """Network error from splitbee returns 502."""
        with patch("routers.notion.httpx.AsyncClient") as mock_client_cls:
            mock_async_client = AsyncMock()
            mock_async_client.get = AsyncMock(
                side_effect=httpx.RequestError("connection refused")
            )
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_async_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            response = client.get("/notion/some-page-id", headers=auth_headers)

        assert response.status_code == 502

    def test_upstream_4xx_returns_same_status(self, client, auth_headers):
        """A 404 from splitbee is forwarded with the same status code."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "not found", request=MagicMock(), response=mock_response
        )

        with patch("routers.notion.httpx.AsyncClient") as mock_client_cls:
            mock_async_client = AsyncMock()
            mock_async_client.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_async_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            response = client.get("/notion/nonexistent-page", headers=auth_headers)

        assert response.status_code == 404

    def test_requires_authentication(self, client):
        """Unauthenticated request returns 401."""
        response = client.get("/notion/248cf5e9d029808eb124f2913f1dc259")
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client):
        """Invalid token is rejected."""
        response = client.get(
            "/notion/some-page-id",
            headers={"Authorization": "Bearer bad-token"},
        )
        assert response.status_code == 401
