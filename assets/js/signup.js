/**
 * DANK Cannabis Club — Signup Page Logic v3.0
 * OTP Flow: Frontend generates OTP → EmailJS sends to manager → staff enters OTP
 * Requires: config.js → emailjs-config.js → supabase.js → auth.js
 */
'use strict';

window.addEventListener('DOMContentLoaded', () => {
  AuthGuard.redirectIfAuth();
  document.getElementById('fullNameInput')?.focus();
  document.getElementById('passwordInput')?.addEventListener('input', checkPasswordStrength);
});

async function handleSignup(e) {
  e.preventDefault();
  hideAlert();

  const fullName = document.getElementById('fullNameInput').value.trim();
  const username = document.getElementById('usernameInput').value.trim();
  const email    = document.getElementById('emailInput').value.trim();
  const phone    = document.getElementById('phoneInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const confirm  = document.getElementById('confirmPasswordInput').value;

  if (!fullName)                          return showAlert('กรุณากรอกชื่อ-นามสกุล');
  if (!username || username.length < 3)   return showAlert('Username ต้องมีอย่างน้อย 3 ตัวอักษร');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return showAlert('Username ใช้ได้เฉพาะ a-z, 0-9, _ เท่านั้น');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAlert('รูปแบบอีเมลไม่ถูกต้อง');
  if (!password || password.length < 6)  return showAlert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  if (password !== confirm)               return showAlert('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
  if (!document.getElementById('agreeCheck')?.checked) return showAlert('กรุณายอมรับเงื่อนไขการใช้งาน');

  setLoading(true);

  // 1. สร้าง user ใน Supabase (ไม่ต้องยืนยันอีเมลผ่าน Supabase)
  const { user, error } = await AuthService.signup({ email, password, fullName, username, phone });
  if (error) { showAlert(error); setLoading(false); return; }

  // 2. Generate OTP 6 หลัก
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 นาที

  // 3. เก็บ OTP ใน sessionStorage
  sessionStorage.setItem('dank_pending_email', email.toLowerCase().trim());
  sessionStorage.setItem('dank_otp_code',   otp);
  sessionStorage.setItem('dank_otp_expiry', otpExpiry);
  sessionStorage.setItem('dank_staff_name', fullName);

  // 4. ส่ง OTP ไปที่อีเมลผู้จัดการผ่าน EmailJS
  const sent = await sendOtpToManager({ otp, fullName, email });

  if (!sent) {
    showAlert('ส่ง OTP ไม่ได้ — ตรวจสอบการเชื่อมต่อแล้วลองใหม่');
    setLoading(false);
    return;
  }

  showAlert(`✅ ส่ง OTP ไปที่ผู้จัดการแล้ว! รอรับรหัสจากผู้จัดการ...`, true);
  setTimeout(() => window.location.href = AUTH_CONFIG.verifyPage, 1500);
}

// ── ส่ง OTP ผ่าน EmailJS ─────────────────────────────────────────
async function sendOtpToManager({ otp, fullName, email }) {
  try {
    const cfg = window.EMAILJS_CONFIG;
    emailjs.init(cfg.publicKey);

    const result = await emailjs.send(cfg.serviceId, cfg.templateId, {
      staff_name:  fullName,
      staff_email: email,
      otp_code:    otp,
      to_email:    cfg.managerEmail,
    });

    return result.status === 200;
  } catch (err) {
    console.error('[DANK] EmailJS error:', err);
    return false;
  }
}

// ── UI Helpers ───────────────────────────────────────────────────
function togglePassword(fieldId, btnId) {
  const input = document.getElementById(fieldId);
  const btn   = document.getElementById(btnId);
  if (!input) return;
  const hidden = input.type === 'password';
  input.type = hidden ? 'text' : 'password';
  if (btn) btn.textContent = hidden ? '🙈' : '👁️';
}

function checkPasswordStrength() {
  const pw    = document.getElementById('passwordInput')?.value || '';
  const bar   = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  if (!bar) return;
  let score = 0;
  if (pw.length >= 6)          score++;
  if (pw.length >= 10)         score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const lvls = [
    { pct:20, color:'#ef4444', text:'อ่อนมาก' },
    { pct:40, color:'#f97316', text:'อ่อน' },
    { pct:60, color:'#eab308', text:'ปานกลาง' },
    { pct:80, color:'#22c55e', text:'แข็งแรง' },
    { pct:100, color:'#4ade80', text:'แข็งแรงมาก' },
  ];
  const lvl = lvls[Math.min(score, 4)];
  bar.style.width      = lvl.pct + '%';
  bar.style.background = lvl.color;
  if (label) label.textContent = lvl.text;
}

function setLoading(on) {
  const btn     = document.getElementById('signupBtn');
  const spinner = document.getElementById('signupSpinner');
  const label   = document.getElementById('signupBtnLabel');
  if (btn)     { btn.disabled = on; btn.classList.toggle('loading', on); }
  if (spinner) spinner.style.display = on ? 'block' : 'none';
  if (label)   label.textContent = on ? 'กำลังสร้างบัญชี...' : '🌿 สร้างบัญชี';
}
function showAlert(msg, success = false) {
  const el    = document.getElementById('authAlert');
  const icon  = document.getElementById('authAlertIcon');
  const msgEl = document.getElementById('authAlertMsg');
  if (el)    el.className = 'auth-alert show' + (success ? ' auth-success' : '');
  if (icon)  icon.textContent  = success ? '✅' : '⚠️';
  if (msgEl) msgEl.textContent = msg;
}
function hideAlert() {
  const el = document.getElementById('authAlert');
  if (el) el.className = 'auth-alert';
}
