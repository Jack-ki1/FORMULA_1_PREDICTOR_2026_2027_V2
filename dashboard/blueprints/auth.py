"""Auth blueprint — issues JWTs without requiring a user table; demo-grade login."""
from flask import Blueprint, request, jsonify
from security.auth import generate_jwt_token, decode_jwt_token, AuthError
from security.middleware import rate_limit
from config.settings import settings

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/login", methods=["POST"])
@rate_limit("10/hour")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or data.get("user_id") or "").strip()
    password = (data.get("password") or "").strip()
    # Demo mode: accept any non-empty username; optionally verify against env
    # Set AUTH_PASSWORD in .env to enforce a password.
    import os
    required_pwd = os.getenv("AUTH_PASSWORD", "")
    if not username:
        return jsonify({"error": "username is required"}), 400
    if required_pwd and password != required_pwd:
        return jsonify({"error": "invalid credentials"}), 401
    role = "admin" if username.lower() == "admin" else "user"
    token = generate_jwt_token(user_id=username, user_role=role)
    return jsonify({"token": token, "user_id": username, "role": role})

@auth_bp.route("/api/verify", methods=["GET", "POST"])
def verify():
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    else:
        data = request.get_json(silent=True) or {}
        token = data.get("token") or request.args.get("token")
    if not token:
        return jsonify({"valid": False, "error": "no token"}), 401
    try:
        payload = decode_jwt_token(token)
        return jsonify({"valid": True, "payload": payload})
    except AuthError as e:
        return jsonify({"valid": False, "error": str(e)}), 401
