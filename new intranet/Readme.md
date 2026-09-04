# JACHINS Intranet — PHP auth (no database)

## Requirements
PHP 7.4+ with the `session` extension (built in). No database, no Composer packages.

## Dummy accounts are already in the box
`data/employees.json` ships with 20 placeholder accounts (`EMP-001`...`EMP-020`),
so the site can launch before real employee data exists. `EMP-001` is set
to `admin` role — log in with it first.

**Passwords are in `data/dummy-employee-credentials.csv`** — each of the 20
accounts has its own random password. Distribute them, then **delete this
CSV**. It's the only place any of these passwords exist as plaintext.

To replace a dummy profile with a real employee: log in as `EMP-001`, go
to `admin.php`, click **Edit** next to the dummy row, and enter the real
name/email/department. The employee ID and password stay the same — only
the profile info changes, so nothing needs rebuilding. Employees should
then use **Change Password** (top-right menu) to set their own password.

To add more dummy accounts beyond the first 20:
```
php scripts/seed-dummy-employees.php 10
```
(creates 10 more, `EMP-021` onward — safe to re-run, skips existing IDs)

## First-time setup on your server
1. Upload the whole `intranet/` folder as-is.
2. Confirm `data/.htaccess` and `includes/.htaccess` are present and that
   your host respects `.htaccess` (Apache with `AllowOverride All`, or
   equivalent). On Nginx there's no `.htaccess` — add to your server block:
   ```
   location /data/ { deny all; }
   location /includes/ { deny all; }
   ```
3. Make `data/employees.json` writable by PHP: `chmod 664 data/employees.json`
   and make sure the `data/` directory itself is writable too.
4. Create your accounts:
   ```
   php scripts/seed-employees.php
   ```
   Run this on the server (SSH) or locally then upload the resulting
   `data/employees.json`. It prompts for each employee's ID, email, name,
   department, role, and initial password — type `done` when finished.
5. Serve over **HTTPS**. `config.php` only marks the session cookie
   `Secure` when it detects HTTPS, so logins will still work over plain
   HTTP for local testing, but don't run it that way in production.

## Day-to-day admin
- Log in with an `admin`-role account, then go to `admin.php` to add more
  employees or disable/reactivate accounts — no CLI needed for that.
- Each new account receives a one-time password setup link after creation.
   Copy the link from the success message in `admin.php` and send it to the
   employee's verified work email. The link expires after 24 hours and can be
   used once. The employee then signs in at `index.php`.

## What's enforced, and where
| Requirement | File |
|---|---|
| Password hashing (bcrypt) | `includes/auth.php` → `create_employee()`, `attempt_login()` |
| HttpOnly / Secure / SameSite=Strict session cookie | `config.php` |
| CSRF protection | `includes/auth.php` → `csrf_field()` / `verify_csrf()`, used in every POST form |
| Per-account lockout (5 failed attempts → 15 min) | `includes/auth.php` → `attempt_login()` |
| Server-side authorization (not just hidden links) | `includes/auth.php` → `require_login()` / `require_admin()`, called at the top of every protected page |
| No secrets in frontend JS/HTML | Nothing — all of the above runs server-side in PHP |

## Known gaps / next steps
- There is no mail provider configured, so the admin currently copies the
   setup link manually. Connect an SMTP or transactional email provider before
   production use.
- There is no self-service "forgot password" — an admin resets via the
   **Reset Password** button on `admin.php`.
- No rate limiting by IP address (only by account, via the 5-attempt
  lockout) — fine for an internal tool, worth adding if ever internet-facing
  without a VPN.