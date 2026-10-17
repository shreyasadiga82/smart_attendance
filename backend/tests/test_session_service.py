import pytest
from datetime import datetime, time
from unittest.mock import patch
from app.services.session_service import SessionService


def test_session_service_initialization():
    """Test that SessionService initializes with correct times from settings"""
    service = SessionService()
    # Check that times are set (they come from settings, which have defaults)
    assert service.morning_start == time(8, 0)  # Default from settings
    assert service.morning_end == time(9, 30)
    assert service.afternoon_start == time(13, 0)
    assert service.afternoon_end == time(14, 0)


def test_get_current_session_outside_hours():
    """Test get_current_session returns None outside of session hours"""
    service = SessionService()
    # Mock datetime.now() to return a time outside sessions
    with patch('app.services.session_service.datetime') as mock_dt:
        mock_dt.now.return_value.time.return_value = time(12, 0)  # Noon
        assert service.get_current_session() is None


def test_get_current_session_morning():
    """Test get_current_session returns 'morning' during morning session"""
    service = SessionService()
    with patch('app.services.session_service.datetime') as mock_dt:
        mock_dt.now.return_value.time.return_value = time(9, 0)  # 9 AM
        assert service.get_current_session() == "morning"


def test_get_current_session_afternoon():
    """Test get_current_session returns 'afternoon' during afternoon session"""
    service = SessionService()
    with patch('app.services.session_service.datetime') as mock_dt:
        mock_dt.now.return_value.time.return_value = time(13, 30)  # 1:30 PM
        assert service.get_current_session() == "afternoon"


def test_is_session_active():
    """Test is_session_active returns correct boolean"""
    service = SessionService()
    with patch('app.services.session_service.datetime') as mock_dt:
        # Outside session
        mock_dt.now.return_value.time.return_value = time(12, 0)
        assert service.is_session_active() is False

        # Inside morning session
        mock_dt.now.return_value.time.return_value = time(9, 0)
        assert service.is_session_active() is True

        # Inside afternoon session
        mock_dt.now.return_value.time.return_value = time(13, 30)
        assert service.is_session_active() is True