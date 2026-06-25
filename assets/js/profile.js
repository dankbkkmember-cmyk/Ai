/**
 * DANK Cannabis Club — Profile Page Logic v2.1
 * Requires: config.js → supabase.js → auth.js
 */
'use strict';

let _currentUser    = null;
let _currentProfile = null;

window.addEventListener('DOMContentLoaded', async () => {
  const ok = await AuthGuard.protect();
  if (!ok) return;

  try {
    const { data: { user } } = await getSupabase().auth.getUser();
    _currentUser    = user;
    _currentProfile = await AuthService.getProfile(user.id);
    populateForm(_currentUser, _currentProfile);
    await AuthGuard.injectUserUI();
  } catch (err) {
    console.error('[DANK] profile load:', err);
    showAlert('โหลดโปรไฟล์ไม่ได้ — โปรดรีเฟรช');
  }
});

function populateForm(user, profile) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('profileFullName', profile?.full_name || user?.user_metadata?.full_name || '');
  set('profileUsername', profile?.username  || user?.user_metadata?.username  || '');
  set('profileEmail',    user?.email || '');
  set('profilePhone',    profile?.phone     || user?.user_metadata?.phone     || '');
  set('profileRole',     profile?.role   || 'budtender');
  set('profileBranch',   profile?.branch || 'PTK');
  set('profileAvatar',   profile?.avatar || '👤');
  const emailEl = document.getElementById('profileEmail');
  if (emailEl) emailEl.disabled = true; // email changes via Supabase updateUser
}

async function handleProfileSave(e) {
  e.preventDefault();
  hideAlert();

  const fullName = document.getElementById('profileFullName')?.value.trim() || '';
  const username = document.getElementById('profileUsername')?.value.trim() || '';
  const phone    = document.getElementById('profilePhone')?.value.trim()    || '';
  const avatar   = document.getElementById('profileAvatar')?.value.trim()   || '👤';

  if (!fullName) return showAlert('กรุณากรอกชื่อ-นามสกุล');
  if (username && username.length < 3) return showAlert('Username ต้องมีอย่างน้อย 3 ตัวอักษร');
  if (username && !/^[a-zA-Z0-9_]+$/.test(username)) return showAlert('Username ใช้ได้เฉพาะ a-z, 0-9, _');

  setSaveLoading(true);

  const updates = { full_name: fullName, username: username || null, phone, avatar };
  const { data, error } = await AuthService.updateProfile(_currentUser.id, updates);

  if (error) { showAlert(error); setSaveLoading(false); return; }

  _currentProfile = data;

  // Sync user_metadata too
  await getSupabase().auth.updateUser({ data: { full_name: fullName, username, phone } });

  showAlert('✅ บันทึกโปรไฟล์แล้ว', true);
  await AuthGuard.injectUserUI();
  setSaveLoading(false);
}

async function handlePasswordChange(e) {
  e.preventDefault();
  const current = document.getElementById('currentPassword')?.value || '';
  const newPw   = document.getElementById('newPassword')?.value     || '';
  const confirm = document.getElementById('confirmNewPassword')?.value || '';

  if (!current) return showAlert('กรุณากรอกรหัสผ่านปัจจุบัน');
  if (!newPw || newPw.length < 6) return showAlert('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
  if (newPw !== confirm) return showAlert('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');

  // Re-authenticate first
  const { error: loginError } = await AuthService.login(_currentUser.email, current);
  if (loginError) return showAlert('รหัสผ่านปัจจุบันไม่ถูกต้อง');

  const { error } = await AuthService.updatePassword(newPw);
  if (error) return showAlert(error);

  showAlert('✅ เปลี่ยนรหัสผ่านแล้ว', true);
  e.target.reset();
}

function setSaveLoading(on) {
  const btn   = document.getElementById('saveProfileBtn');
  const label = document.getElementById('saveProfileBtnLabel');
  if (btn)   btn.disabled     = on;
  if (label) label.textContent = on ? 'กำลังบันทึก...' : '💾 บันทึก';
}
function showAlert(msg, success = false) {
  const el    = document.getElementById('profileAlert');
  const msgEl = document.getElementById('profileAlertMsg');
  if (el)    el.className = 'auth-alert show' + (success ? ' auth-success' : '');
  if (msgEl) msgEl.textContent = msg;
  if (success) setTimeout(hideAlert, 3000);
}
function hideAlert() {
  const el = document.getElementById('profileAlert');
  if (el) el.className = 'auth-alert';
}
