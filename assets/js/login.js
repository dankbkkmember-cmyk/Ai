/**
 * DANK Cannabis Club — Login Page Logic v2.1
 * Requires: config.js → supabase.js → auth.js
 */
'use strict';

// Redirect to dashboard if already logged in (async)
window.addEventListener('DOMContentLoaded', () => {
  AuthGuard.redirectIfAuth();
});

async function handleLogin(e) {
  e.preventDefault();
  hideAlert();

  const email    = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  if (!email)    return showAlert('กรุณากรอกอีเมล');
  if (!password) return showAlert('กรุณากรอกรหัสผ่าน');

  setLoading(true);

  const { user, error } = await AuthService.login(email, password);

  if (error) {
    // Email not confirmed → send to OTP verify page
    if (error.includes('ยังไม่ยืนยันอีเมล')) {
      sessionStorage.setItem('dank_pending_email', email.toLowerCase().trim());
      showAlert('กรุณายืนยันอีเมลก่อน — กำลังพาไปหน้ายืนยัน...', true);
      setTimeout(() => window.location.href = AUTH_CONFIG.verifyPage, 1500);
      return;
    }
    showAlert(error);
    setLoading(false);
    return;
  }

  showAlert(`✅ ยินดีต้อนรับ ${user.name}! กำลังเข้าสู่ระบบ...`, true);
  setTimeout(() => window.location.replace(AUTH_CONFIG.dashPage), 800);
}

function togglePassword() {
  const input  = document.getElementById('passwordInput');
  const toggle = document.getElementById('pwToggle');
  const hidden = input.type === 'password';
  input.type         = hidden ? 'text' : 'password';
  toggle.textContent = hidden ? '🙈' : '👁️';
}

function fillDemo(email, password) {
  document.getElementById('emailInput').value    = email;
  document.getElementById('passwordInput').value = password;
  document.getElementById('emailInput').focus();
}

function openForgot() {
  document.getElementById('forgotOverlay').classList.add('show');
  const email = document.getElementById('emailInput').value;
  if (email) document.getElementById('forgotEmail').value = email;
}
function closeForgot() {
  document.getElementById('forgotOverlay').classList.remove('show');
  const a = document.getElementById('forgotAlert');
  if (a) { a.className = 'auth-alert'; a.textContent = ''; }
}
function closeForgotOnBackdrop(e) {
  if (e.target === e.currentTarget) closeForgot();
}
async function handleForgot() {
  const email   = document.getElementById('forgotEmail').value.trim();
  const alertEl = document.getElementById('forgotAlert');
  if (!email) { alertEl.className = 'auth-alert show'; alertEl.textContent = '⚠️ กรุณากรอกอีเมล'; return; }
  alertEl.className = 'auth-alert show auth-success'; alertEl.textContent = '⏳ กำลังส่ง...';
  const { error } = await AuthService.resetPassword(email);
  if (error) {
    alertEl.className = 'auth-alert show'; alertEl.textContent = '⚠️ ' + error;
  } else {
    alertEl.className = 'auth-alert show auth-success';
    alertEl.textContent = `✅ ส่งลิงก์รีเซ็ตไปที่ ${email} แล้ว — ตรวจสอบอีเมล (ดู Spam ด้วย)`;
  }
}

function setLoading(on) {
  const btn     = document.getElementById('loginBtn');
  const spinner = document.getElementById('loginSpinner');
  const label   = document.getElementById('loginBtnLabel');
  if (btn)    { btn.disabled = on; btn.classList.toggle('loading', on); }
  if (spinner) spinner.style.display = on ? 'block' : 'none';
  if (label)   label.textContent = on ? 'กำลังเข้าสู่ระบบ...' : '🔑 เข้าสู่ระบบ';
}
function showAlert(msg, success = false) {
  const el   = document.getElementById('authAlert');
  const icon = document.getElementById('authAlertIcon');
  const msgEl = document.getElementById('authAlertMsg');
  if (el)    el.className = 'auth-alert show' + (success ? ' auth-success' : '');
  if (icon)  icon.textContent  = success ? '✅' : '⚠️';
  if (msgEl) msgEl.textContent = msg;
}
function hideAlert() {
  const el = document.getElementById('authAlert');
  if (el) el.className = 'auth-alert';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeForgot(); });
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('emailInput')?.focus();
});
