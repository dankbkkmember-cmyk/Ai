#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  DANK Cannabis Club — Deploy to GitHub Pages
#  วิธีใช้: เปิด Terminal → cd ไปโฟลเดอร์ Desktop → bash deploy.sh
# ══════════════════════════════════════════════════════════════

echo ""
echo "🌿 DANK Cannabis Club — Deploy Script"
echo "══════════════════════════════════════"

# ── กรอก GitHub repo URL ของคุณตรงนี้ ──────────────────────────
# ตัวอย่าง: https://github.com/nonnaowarat-art/shopaiagenapp.git
GITHUB_REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
# ──────────────────────────────────────────────────────────────

# Check git installed
if ! command -v git &> /dev/null; then
  echo "❌ Git ไม่ได้ติดตั้ง — ไปโหลดที่ https://git-scm.com"
  exit 1
fi

echo "📁 Working folder: $(pwd)"
echo ""

# Init git ถ้ายังไม่มี
if [ ! -d ".git" ]; then
  echo "🔧 Initializing git..."
  git init
  git branch -M main
fi

# Connect remote ถ้ายังไม่มี
if ! git remote get-url origin &> /dev/null; then
  echo "🔗 Connecting to: $GITHUB_REPO_URL"
  git remote add origin "$GITHUB_REPO_URL"
else
  echo "🔗 Remote: $(git remote get-url origin)"
fi

# Stage ไฟล์ทั้งหมด (config.js จะถูก skip โดย .gitignore อัตโนมัติ)
echo ""
echo "📦 Staging files..."
git add .

# แสดงไฟล์ที่จะ commit
echo ""
echo "📋 Files to commit:"
git diff --cached --name-only

echo ""
read -p "✅ ยืนยัน commit? (y/n): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "❌ ยกเลิก"
  exit 0
fi

# Commit
git commit -m "🌿 DANK AI Center — Supabase Auth v2.0

- Supabase Authentication (Email + OTP)
- signup / verify-email / forgot-password / reset-password pages
- Modular JS: supabase.js, auth.js, login.js, signup.js, otp.js
- profiles table with RLS + role-based access
- config.js gitignored (credentials safe)
- README.md with full setup guide"

# Push
echo ""
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo ""
echo "══════════════════════════════════════"
echo "✅ Push สำเร็จ!"
echo ""
echo "⚠️  ขั้นตอนถัดไป (สำคัญ):"
echo "  1. ไปที่ GitHub repo → เปิด Settings → Pages"
echo "     Source: Deploy from branch → main → / (root)"
echo "     กด Save"
echo ""
echo "  2. สร้าง config.js บน GitHub:"
echo "     repo → assets/js/ → Add file → Create new file"
echo "     ชื่อ: config.js → วางเนื้อหาจากไฟล์ config.js บน Desktop"
echo "     (ใส่ Supabase URL + Key จริงด้วย)"
echo ""
echo "  3. เพิ่ม redirect URL ใน Supabase:"
echo "     Authentication → Settings → URL Config"
echo "     เพิ่ม: https://YOUR_USERNAME.github.io/YOUR_REPO/reset-password.html"
echo "══════════════════════════════════════"
