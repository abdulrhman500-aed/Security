# Secure Authentication System

A Python Web project demonstrating secure authentication basics: Argon2id hashing, login verification, account lockout, session token management, role-based access, and password reset.

It features a premium, modern glassmorphic web dashboard with interactive controls, secure session token visualization, and an administrative user directory.

## Run

To run the application:

1. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

## Admin Account

The first registered account becomes the admin account automatically. If `users.json` is empty or no admin exists, the next registered account is assigned the `admin` role. Later registrations are regular `user` accounts.

## Files

- `app.py` - main application and UI template
- `users.json` - database generated automatically after registration
- `REPORT.md` - security report covering core authentication concepts

## Features

- Register users with Argon2id password hashes
- Bootstrap the first registered account as admin
- Login with password verification
- Lock account for 30 seconds after 3 failed login attempts (Brute force protection)
- Generate secure random session tokens on successful login
- Store only Argon2id session token hashes
- Invalidate session tokens on logout
- Store password, security answer, and session token hashes with Argon2id
- Store all user records in JSON format (no plaintext passwords or answers)
- Role-based access control (admin vs. user) with privilege checks
- Password reset using a secret security question verified securely on the server
- Premium responsive Dark-themed UI with glassmorphic cards and micro-animations
