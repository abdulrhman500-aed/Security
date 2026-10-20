# Secure Authentication System Report

## Project Summary

This project implements a secure Python user authentication system using:

- Random salts for each password
- Argon2id hashing for passwords, security answers, and session tokens
- JSON persistence without plaintext passwords
- Login verification with constant-time comparison
- Account lockout for 30 seconds after 3 failed attempts
- Secure random session tokens
- Logout-based session invalidation
- Role-based access control for `admin` and `user`
- Password reset with a secret security question

Run the project with:

```bash
python app.py
```

User records are saved in `users.json`. The file stores Argon2id hashes, role data, failed-login metadata, and hashed session token data. It does not store plaintext passwords, plaintext security answers, or plaintext session tokens.

The first registered account is automatically assigned the `admin` role. If user data is cleared or no admin exists, the next registered account becomes the admin account so the admin directory can be reached without manually editing JSON.

## Encryption vs. Hashing

Encryption is reversible. If data is encrypted, someone with the correct key can decrypt it and recover the original plaintext. This is useful when the original data must be read later, such as encrypted files or secure messages.

Hashing is one-way. A hash function transforms input into a fixed-size output, but the original input should not be recoverable from the hash. For password storage, hashing is preferred because the system does not need to know the original password. It only needs to hash a login attempt and compare that result with the stored hash.

If a password database is stolen and passwords were encrypted, an attacker might recover all passwords if they also obtain the encryption key. If passwords are properly salted and hashed, the attacker must guess each password individually.

## Rainbow Table Attacks and Salts

A Rainbow Table attack uses large precomputed tables of common passwords and their hashes. If many systems use the same hash algorithm without salts, the same password always produces the same hash. An attacker can look up a stolen hash in a Rainbow Table and quickly discover the original password.

A salt is random data generated for each secret. The salt is combined with the secret before hashing. This means two users with the same password still have different hashes because their salts are different.

Adding a salt neutralizes Rainbow Tables because attackers cannot use one general precomputed table for every user. They would need to build a separate table for each unique salt, which becomes impractical when salts are long and random.

## Timing Attacks and Constant-Time Comparison

A Timing Attack tries to learn secret information by measuring how long operations take. With a normal `==` comparison, the program may stop checking as soon as it finds the first different character. This can leak tiny timing differences that reveal how many characters were correct.

Argon2 verification avoids directly comparing raw secrets in application code. It verifies submitted values against the stored Argon2 hash using the password-hashing library.

In this project, Argon2id is used when verifying password hashes, security answer hashes, and session token hashes.

## Why bcrypt and Argon2 Are Recommended in Production

Plain SHA-256 is fast. That speed is useful for file checksums and data integrity, but it is dangerous for password storage because attackers can try billions of guesses quickly using GPUs or specialized hardware.

bcrypt and Argon2 are designed for password hashing. They intentionally make each password guess expensive.

bcrypt includes a configurable work factor, which lets developers increase the cost as hardware becomes faster.

Argon2, especially Argon2id, is also memory-hard. It requires significant memory as well as CPU time, making large-scale cracking harder and more expensive.

This project uses Argon2id through `argon2-cffi`. Argon2id stores its algorithm settings and random salt inside the encoded hash string, so the JSON file does not need separate salt fields.

## Secure Password Reset Flow Design

A secure password reset mechanism requires the same cryptographic rigor as registration and login to avoid account takeover vulnerabilities:

1. **Information Leak Mitigation**: The first step retrieves the security question by username. If a username does not exist, the API responds with a generic `User not found` error rather than a specific database exception.
2. **Zero Plaintext Storage**: The answer to the security question is never stored in plaintext. During registration, it is normalized and stored only as an Argon2id hash.
3. **Secure Verification**: During the reset attempt, the API verifies the submitted answer against the stored Argon2id hash before allowing a password change.
4. **Lockout Cleared Upon Success**: If the security answer is correct, the password is reset using a new Argon2id hash, the active session token is cleared, and the account lockout failure count is set back to zero to immediately allow access.

---

## Security Notes

- Passwords are never stored directly.
- Security answers are also stored as Argon2id hashes.
- Session tokens are shown once on login, but only their Argon2id hashes are stored.
- Logging out removes the stored session token hash and salt.
- Failed login attempts lock the account for 30 seconds after 3 consecutive failures.
- Admin-only functionality is protected by role checks.
