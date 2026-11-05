import pytest
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token


def test_password_hashing():
    pwd = "GovSecurePassword123!"
    h = get_password_hash(pwd)
    assert h != pwd
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword!", h) is False


def test_jwt_token_creation_and_decoding():
    data = {"sub": "inspector_mehta", "role": "investigating_officer"}
    token = create_access_token(data)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "inspector_mehta"
    assert payload["role"] == "investigating_officer"


def test_jwt_invalid_token():
    invalid_token = "invalid.token.structure"
    payload = decode_access_token(invalid_token)
    assert payload is None
