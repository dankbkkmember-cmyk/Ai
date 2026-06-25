# 🌿 DANK Cannabis Club — AI Command Center

A single-page staff dashboard for DANK Cannabis Club (Pattanakarn PTK & Sathorn STH branches, Bangkok). Built with vanilla HTML/CSS/JS and Supabase Authentication.

---

## 🔐 Authentication Overview

| Feature | Implementation |
|---|---|
| Provider | Supabase Auth |
| Method | Email + Password |
| Verification | Email OTP (6-digit code) |
| Session | Supabase managed (localStorage) |
| Password Reset | Supabase magic link email |
| Profiles | PostgreSQL `profiles` table |
| Credentials | `assets/js/config.js` (gitignored) |

---

## 📁 Project Structure

```
/
├── index.html                  ← redirects to login.html (optional)
├── login.html                  ← Sign in page
├── signup.html                 ← Registration page
├── verify-email.html           ← OTP verification (6-digit)
├── forgot-password.html        ← Request password reset email
├── reset-password.html         ← Set new password (from email link)
├── dank-ai-center.html         ← Main protected dashboard
│
├── assets/
│   ├── css/
│   │   └── auth.css            ← Shared auth page styles
│   └── js/
│       ├── config.example.js   ← Credential template (safe to commit)
│       ├── config.js           ← YOUR credentials (gitignored ⚠️)
│       ├── supabase.js         ← Supabase client init (reads config.js)
│       ├── auth.js             ← AuthService + AuthGuard
│       ├── login.js            ← Login page logic
│       ├── signup.js           ← Signup page logic
│       ├── otp.js              ← OTP verification logic
│       ├── dashboard.js        ← Session management + role helpers
│       └── profile.js          ← Profile CRUD
│
├── supabase-setup.sql          ← Run in Supabase SQL Editor
├── .env                        ← Variable documentation (not read at runtime)
├── .gitignore                  ← Keeps config.js out of Git
└── README.md                   ← This file
```

---

## 🚀 Setup Guide

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `dank-cannabis-club` (or anything)
   - **Database Password**: generate a strong one and save it
   - **Region**: Southeast Asia (Singapore) — closest to Bangkok
4. Click **"Create new project"** — takes ~2 minutes to provision

---

### Step 2 — Enable Email Authentication

1. In your project dashboard, go to **Authentication → Settings → Providers**
2. Make sure **Email** provider is **enabled** (it is by default)
3. Go to **Authentication → Settings → General**
4. Configure:
   ```
   ✅ Enable email confirmations   → ON
   ✅ Confirm email                → set to "OTP" (not "link")
   📌 OTP expiry                  → 300 seconds (5 minutes)
   ```
5. Under **URL Configuration**:
   ```
   Site URL:              http://localhost:5500   ← for local dev
                          https://your-site.github.io/repo  ← for production
   
   Additional Redirect URLs:
   http://localhost:5500/reset-password.html
   https://your-site.github.io/repo/reset-password.html
   ```

> **Why OTP instead of magic link?**
> OTP (6-digit code) works better for a staff portal — employees check their email
> and type the code directly. No clicking a link in the email needed.

---

### Step 3 — Configure the Email Sender

#### Option A: Use Supabase's default email (easy, fine for testing)
- Nothing to do — Supabase sends emails automatically
- Limit: **~4 emails/hour** in free tier
- From address: `noreply@mail.app.supabase.io`

#### Option B: Use your own domain email (recommended for production)

1. Go to **Authentication → Settings → SMTP Settings**
2. Toggle **"Enable Custom SMTP"** → ON
3. Fill in your SMTP details:

   ```
   SMTP Host:      smtp.resend.com           ← example using Resend
   SMTP Port:      465
   SMTP User:      resend
   SMTP Password:  re_xxxxxxxxxxxx           ← your Resend API key
   Sender Name:    DANK Cannabis Club
   Sender Email:   noreply@yourdomain.com
   ```

**Recommended SMTP providers:**

| Provider | Free Tier | Notes |
|---|---|---|
| [Resend](https://resend.com) | 3,000 emails/month | Easiest setup, modern API |
| [SendGrid](https://sendgrid.com) | 100/day | Very common, reliable |
| [Brevo](https://brevo.com) | 300/day | Good free tier |
| [AWS SES](https://aws.amazon.com/ses) | Pay per use ~$0.10/1000 | Cheapest at scale |

---

### Step 4 — Set Up the Database

1. In Supabase, go to **SQL Editor** → **New Query**
2. Copy the entire contents of `supabase-setup.sql`
3. Paste and click **Run**
4. This creates:
   - `profiles` table with RLS (Row Level Security)
   - Auto-trigger: creates a profile row whenever a user signs up
   - Policies: users can only read/edit their own profile

5. After creating your owner account (sign up normally), run this to give yourself Owner role:
   ```sql
   UPDATE public.profiles
   SET role = 'owner', branch = 'ALL', avatar = '👑'
   WHERE id = (
     SELECT id FROM auth.users
     WHERE email = 'your-email@example.com'
     LIMIT 1
   );
   ```

---

### Step 5 — Add Your Environment Variables

1. In Supabase Dashboard → **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (long JWT string)

3. In your project folder, copy the config template:
   ```bash
   cp assets/js/config.example.js assets/js/config.js
   ```

4. Open `assets/js/config.js` and fill in:
   ```javascript
   const SUPABASE_URL      = 'https://YOUR_REAL_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR...YOUR_REAL_KEY';
   const SITE_URL          = 'http://localhost:5500';  // change for production
   ```

> ⚠️ **`config.js` is in `.gitignore`** — it will never be committed to GitHub.
> The anon key is safe to use in the browser (it's designed for client-side use),
> but we still keep it out of Git as best practice.

---

### Step 6 — Run Locally

This is a static site — no build step required.

**Option A: VS Code Live Server (recommended)**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `login.html` → **"Open with Live Server"**
3. Opens at `http://localhost:5500/login.html`

**Option B: Python built-in server**
```bash
cd /path/to/your/project
python3 -m http.server 5500
# Open: http://localhost:5500/login.html
```

**Option C: Node http-server**
```bash
npx http-server . -p 5500
# Open: http://localhost:5500/login.html
```

**Test the full flow:**
1. Go to `login.html` → click "สมัครสมาชิก" (signup)
2. Fill in all fields → submit
3. Check your email for the 6-digit OTP
4. Enter OTP in `verify-email.html`
5. Should redirect to `dank-ai-center.html` ✅

---

### Step 7 — Deploy to GitHub Pages

1. **Initialize Git** (if not already):
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   ```
   > `.gitignore` will automatically exclude `config.js` and `.env`

2. **Create GitHub repo**:
   - Go to [github.com/new](https://github.com/new)
   - Name it (e.g. `dank-ai-center`)
   - Keep it **private** (recommended for a staff tool)
   - Click "Create repository"

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/dank-ai-center.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**:
   - Go to repo → Settings → Pages
   - Source: **Deploy from a branch** → `main` / `/ (root)`
   - Click Save
   - Your site will be at: `https://YOUR_USERNAME.github.io/dank-ai-center/`

5. **⚠️ config.js on the server**:
   Since `config.js` is gitignored, it won't be in GitHub.
   For GitHub Pages you have two options:
   
   **Option A (simple):** Manually upload `config.js` via GitHub web UI
   - Go to your repo → `assets/js/` → "Add file" → "Create new file"
   - Name: `config.js`, paste the contents with your real credentials
   - This file won't sync with git, so re-do this if you recreate the repo
   
   **Option B (proper CI):** Use GitHub Actions to inject credentials as secrets:
   - Repo → Settings → Secrets and variables → Actions → New repository secret
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   - Create `.github/workflows/deploy.yml` to inject them at build time

6. **Update Supabase URL config** for production:
   - Supabase Dashboard → Authentication → Settings → URL Configuration
   - Add your GitHub Pages URL to **"Additional Redirect URLs"**:
     ```
     https://YOUR_USERNAME.github.io/dank-ai-center/reset-password.html
     ```
   - Update `SITE_URL` in `config.js` to your GitHub Pages URL

---

## 🔑 Authentication Flow

```
signup.html
  │  (email, password, name, username, phone)
  │  → supabase.auth.signUp()
  │  → Supabase sends OTP email automatically
  ↓
verify-email.html
  │  (6-digit OTP, 5-min expiry, resend after 60s)
  │  → supabase.auth.verifyOtp({ type: 'signup' })
  │  → trigger creates profiles row automatically
  ↓
dank-ai-center.html  ✅ (protected)

login.html
  │  (email + password)
  │  → supabase.auth.signInWithPassword()
  ↓
dank-ai-center.html  ✅

forgot-password.html
  │  → supabase.auth.resetPasswordForEmail()
  │  → Supabase sends email with magic link
  ↓
reset-password.html
  │  (URL contains #access_token from email link)
  │  → supabase.auth.updateUser({ password: newPw })
  ↓
login.html  ✅
```

---

## 👥 Role-Based Access

Roles are stored in `profiles.role` column:

| Role | Thai | Access Level |
|---|---|---|
| `owner` | เจ้าของ | Full access (100) |
| `branch_manager` | ผู้จัดการสาขา | Branch-level full (80) |
| `manager` | ผู้จัดการ | Operational (70) |
| `accountant` | นักบัญชี | Finance only (60) |
| `marketing` | การตลาด | Marketing only (50) |
| `budtender` | บัดเทนเดอร์ | POS + basic (40) |
| `kitchen` | ครัว | Kitchen view (30) |
| `delivery_rider` | ไรเดอร์ | Delivery only (20) |

Use `RoleGuard.atLeast('manager')` in page scripts to check access.

---

## 🛡️ Security Notes

- **Anon key is safe for the browser** — it has limited permissions enforced by RLS
- **Never use the `service_role` key** in the browser (full DB bypass)
- **RLS (Row Level Security)** is enabled — users can only read their own profile
- **`config.js` is gitignored** — credentials never go to GitHub
- **Supabase tokens auto-refresh** — handled by the SDK, no manual code needed

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| "Supabase credentials missing" in console | Make sure `config.js` is loaded before `supabase.js` |
| "still has placeholder values" warning | Fill in real URL + Key in `assets/js/config.js` |
| OTP email not received | Check spam folder; verify Supabase email settings |
| OTP expired | Click "ส่งใหม่" (resend) — waits 60s between sends |
| Redirected to login unexpectedly | Session expired — sign in again |
| Reset link doesn't work | Make sure `reset-password.html` URL is in Supabase "Redirect URLs" |
| Stuck on login after signup | Email not verified — go to `verify-email.html` |

---

## 📞 Support

Internal system — contact the system administrator for access issues.

© 2026 DANK Cannabis Club · All rights reserved
