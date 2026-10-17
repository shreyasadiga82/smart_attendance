import pytest
import hashlib
from unittest.mock import MagicMock
from app.routers.devices import hash_token
from app.models import EdgeDevice


def test_token_hashing_consistency():
    token = "edge_abc123secrettoken456"
    expected = hashlib.sha256(token.encode("utf-8")).hexdigest()
    assert hash_token(token) == expected
    assert hash_token(token) != token


def test_edge_device_validation_success():
    raw_token = "edge_test_secret_token_12345"
    stored_hash = hash_token(raw_token)

    mock_db = MagicMock()
    mock_device = EdgeDevice(id=1, name="Kiosk 1 - Entrance", token=stored_hash)

    # When query by hash matches
    mock_db.query.return_value.filter.return_value.first.return_value = mock_device

    # Incoming request presents raw token
    incoming_token_hash = hash_token(raw_token)
    matched = (mock_device.token == incoming_token_hash)
    assert matched is True


def test_edge_device_validation_invalid_token():
    mock_device = EdgeDevice(id=1, name="Kiosk 1", token=hash_token("valid_token"))
    invalid_token = "wrong_token_xyz"
    assert mock_device.token != hash_token(invalid_token)
