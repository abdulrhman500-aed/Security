import json
import secrets
import time
from pathlib import Path
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

DATA_FILE = Path("users.json")
HASH_ALGORITHM = "argon2id"
LOCKOUT_SECONDS = 30
MAX_FAILED_ATTEMPTS = 3

argon2_hasher = PasswordHasher()


def load_users():
    if not DATA_FILE.exists():
        return {}
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_users(users):
    with DATA_FILE.open("w", encoding="utf-8") as file:
        json.dump(users, file, indent=4)


def has_admin(users):
    return any(user.get("role") == "admin" for user in users.values())


def hash_secret(secret):
    return argon2_hasher.hash(secret)


def verify_secret(secret, stored_hash):
    if not secret or not stored_hash:
        return False

    try:
        return argon2_hasher.verify(stored_hash, secret)
    except (TypeError, ValueError, VerifyMismatchError, VerificationError):
        return False


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.json
    users = load_users()

    username = data.get("username", "").strip().lower()
    password = data.get("password")
    question = data.get("question")
    answer = data.get("answer")

    if not username or not password or not question or not answer:
        return jsonify({"error": "Missing fields"}), 400
    if username in users:
        return jsonify({"error": "User already exists"}), 409

    role = "user" if has_admin(users) else "admin"

    users[username] = {
        "hash_algorithm": HASH_ALGORITHM,
        "password_hash": hash_secret(password),
        "security_question": question,
        "security_answer_hash": hash_secret(answer.strip().lower()),
        "role": role,
        "failed_attempts": 0,
        "locked_until": 0,
        "session_token_hash": None,
    }
    save_users(users)
    return jsonify({"message": f"{role.title()} account registered successfully", "role": role})


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.json
    users = load_users()
    username = data.get("username", "").strip().lower()
    password = data.get("password")

    user = users.get(username)
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    now = time.time()
    if user.get("locked_until", 0) > now:
        return jsonify({"error": f"Locked. Try again in {int(user['locked_until'] - now)}s"}), 403

    if verify_secret(password, user["password_hash"]):
        if argon2_hasher.check_needs_rehash(user["password_hash"]):
            user["password_hash"] = hash_secret(password)

        token = secrets.token_urlsafe(32)
        user["session_token_hash"] = hash_secret(token)
        user["failed_attempts"] = 0
        user["locked_until"] = 0
        save_users(users)
        return jsonify({"message": "Login successful", "token": token, "username": username, "role": user["role"]})

    user["failed_attempts"] = user.get("failed_attempts", 0) + 1
    if user["failed_attempts"] >= MAX_FAILED_ATTEMPTS:
        user["locked_until"] = time.time() + LOCKOUT_SECONDS
        user["failed_attempts"] = 0

    save_users(users)
    return jsonify({"error": "Invalid credentials"}), 401


@app.route("/api/logout", methods=["POST"])
def api_logout():
    data = request.json
    username = data.get("username", "").strip().lower()
    token = data.get("token")

    users = load_users()
    user = users.get(username)

    if user and user.get("session_token_hash") and verify_secret(token, user["session_token_hash"]):
        user["session_token_hash"] = None
        save_users(users)
        return jsonify({"message": "Successfully logged out"})

    return jsonify({"error": "Invalid session or already logged out"}), 401


@app.route("/api/admin/users", methods=["GET"])
def api_list_users():
    token = request.headers.get("Authorization")
    username = request.headers.get("Username")

    users = load_users()
    user = users.get(username)

    # Simple session & role verification
    if not user or not user.get("session_token_hash"):
        return jsonify({"error": "Unauthorized"}), 401

    if user["role"] != "admin":
        return jsonify({"error": "Admin access required"}), 403

    if verify_secret(token, user["session_token_hash"]):
        user_list = [{"username": u, "role": info["role"]} for u, info in users.items()]
        return jsonify({"users": user_list})

    return jsonify({"error": "Invalid session"}), 401


@app.route("/api/get-security-question", methods=["POST"])
def api_get_security_question():
    data = request.json
    username = data.get("username", "").strip().lower()

    if not username:
        return jsonify({"error": "Username is required"}), 400

    users = load_users()
    user = users.get(username)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"question": user.get("security_question", "No security question set")})


@app.route("/api/reset-password", methods=["POST"])
def api_reset_password():
    data = request.json
    username = data.get("username", "").strip().lower()
    answer = data.get("answer", "")
    new_password = data.get("new_password", "")

    if not username or not answer or not new_password:
        return jsonify({"error": "Missing fields"}), 400

    users = load_users()
    user = users.get(username)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if verify_secret(answer.strip().lower(), user["security_answer_hash"]):
        user["password_hash"] = hash_secret(new_password)
        user["session_token_hash"] = None
        # Reset lockout state
        user["failed_attempts"] = 0
        user["locked_until"] = 0

        save_users(users)
        return jsonify({"message": "Password reset successfully"})

    return jsonify({"error": "Incorrect answer to security question"}), 401


if __name__ == "__main__":
    app.run(debug=True)
