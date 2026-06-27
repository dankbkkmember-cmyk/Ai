/**
 * DANK Cannabis Club — Authentication Service v2.1
 * Provider : Supabase Auth (supabase-js v2, latest stable API)
 * Flow     : Email + Password  →  Email OTP  →  Dashboard
 *
 * OTP TYPES — current Supabase JS v2 API (none deprecated):
 *   'signup'   → OTP emailed after signUp()          ← we use this
 *   'email'    → OTP emailed after signInWithOtp()   (passwordless — NOT used here)
 *   'recovery' → token from resetPasswordForEmail()
 *
 * No magic links. No deprecated supabase.auth.api.* calls.
 */
'use strict';

// Auto-detect base path — works on localhost AND GitHub Pages (/Ai/)
const _base = (() => {
  const p = window.location.pathname;
  const last = p.lastIndexOf('/');
  return last > 0 ? p.substring(0, last + 1) : '/';
})();

const AUTH_CONFIG = {
  loginPage:  _base + 'login.html',
  signupPage: _base + 'signup.html',
  verifyPage: _base + 'verify-email.html',
  dashPage:   _base + 'dank-ai-center.html',
  forgotPage: _base + 'forgot-password.html',
  resetPage:  _base + 'reset-password.html',
};

// ─────────────────────────────────────────────────────────────
// AUTH SERVICE
// ─────────────────────────────────────────────────────────────
const AuthService = {

  // ── LOGIN ─────────────────────────────────────────────────
  async login(email, password) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { user: null, error: _mapError(error.message) };
      const profile = await this.getProfile(data.user.id);
      return { user: _mergeUserProfile(data.user, profile), error: null };
    } catch (err) {
      console.error('[DANK] login:', err);
      return { user: null, error: 'เชื่อมต่อไม่ได้ — ตรวจสอบอินเทอร์เน็ต' };
    }
  },

  // ── SIGN UP → sends Email OTP ──────────────────────────────
  // supabase.auth.signUp() — current, stable
  // Do NOT set emailRedirectTo → forces OTP mode (not magic link)
  // Requires: Authentication → Settings → "Confirm email" ON
  async signup({ email, password, fullName, username, phone }) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName, username, phone },
          // ⚠️  No emailRedirectTo = Supabase sends 6-digit OTP email, not a link
        },
      });
      if (error) return { user: null, error: _mapError(error.message) };

      // Already confirmed (duplicate email edge case)
      if (data.user?.confirmed_at) {
        return { user: null, error: 'อีเมลนี้มีบัญชีอยู่แล้ว — กรุณา Login' };
      }

      sessionStorage.setItem('dank_pending_email', email.trim().toLowerCase());
      return { user: data.user, error: null };
    } catch (err) {
      console.error('[DANK] signup:', err);
      return { user: null, error: 'เกิดข้อผิดพลาด — โปรดลองใหม่' };
    }
  },

  // ── VERIFY OTP ─────────────────────────────────────────────
  // supabase.auth.verifyOtp({ type: 'signup' }) — current, stable
  // type:'signup' = correct for OTP issued by signUp()
  // type:'email'  = only for passwordless signInWithOtp() — NOT used here
  async verifyOtp(email, token) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type:  'signup',
      });
      if (error) return { session: null, user: null, error: _mapError(error.message) };

      if (data.user) await this._upsertProfile(data.user);
      return { session: data.session, user: data.user, error: null };
    } catch (err) {
      console.error('[DANK] verifyOtp:', err);
      return { session: null, user: null, error: 'ยืนยัน OTP ล้มเหลว — โปรดลองใหม่' };
    }
  },

  // ── RESEND OTP ─────────────────────────────────────────────
  // supabase.auth.resend() — current, stable (added in supabase-js v2.39)
  async resendOtp(email) {
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.resend({
        type:  'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) return { error: _mapError(error.message) };
      return { error: null };
    } catch (err) {
      console.error('[DANK] resendOtp:', err);
      return { error: 'ส่งรหัสใหม่ไม่ได้ — โปรดลองใหม่' };
    }
  },

  // ── LOGOUT ─────────────────────────────────────────────────
  async logout() {
    try { await getSupabase().auth.signOut(); } catch (_) {}
    sessionStorage.removeItem('dank_pending_email');
    window.location.replace(AUTH_CONFIG.loginPage);
  },

  // ── GET SESSION (async, via SDK) ───────────────────────────
  // Always use SDK method — never read localStorage manually
  async getSession() {
    try {
      const { data, error } = await getSupabase().auth.getSession();
      return (!error && data.session) ? data.session : null;
    } catch (_) { return null; }
  },

  async isAuthenticated() {
    return !!(await this.getSession());
  },

  // ── GET CURRENT USER (server-verified) ────────────────────
  async getCurrentUser() {
    try {
      const { data, error } = await getSupabase().auth.getUser();
      return (!error && data.user) ? data.user : null;
    } catch (_) { return null; }
  },

  // ── PROFILE (PostgreSQL profiles table) ───────────────────
  async getProfile(userId) {
    try {
      const { data, error } = await getSupabase()
        .from('profiles').select('*').eq('id', userId).single();
      return error ? null : data;
    } catch (_) { return null; }
  },

  async updateProfile(userId, updates) {
    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId).select().single();
      return error ? { data: null, error: error.message } : { data, error: null };
    } catch (_) { return { data: null, error: 'อัปเดตโปรไฟล์ไม่ได้' }; }
  },

  // ── FORGOT PASSWORD ────────────────────────────────────────
  async resetPassword(email) {
    try {
      const base       = window.DANK_SITE_URL || window.location.origin;
      const redirectTo = base.replace(/\/$/, '') + '/' + AUTH_CONFIG.resetPage;
      const { error }  = await getSupabase().auth.resetPasswordForEmail(
        email.trim().toLowerCase(), { redirectTo }
      );
      return { error: error ? _mapError(error.message) : null };
    } catch (_) { return { error: 'ส่งอีเมลไม่ได้ — โปรดลองใหม่' }; }
  },

  // ── UPDATE PASSWORD (on reset-password.html) ───────────────
  async updatePassword(newPassword) {
    try {
      const { error } = await getSupabase().auth.updateUser({ password: newPassword });
      return { error: error ? _mapError(error.message) : null };
    } catch (_) { return { error: 'เปลี่ยนรหัสผ่านไม่ได้' }; }
  },

  // ── INTERNAL: upsert profiles row after OTP verify ─────────
  async _upsertProfile(user) {
    try {
      const meta = user.user_metadata || {};
      const { error } = await getSupabase().from('profiles').upsert({
        id:        user.id,
        full_name: meta.full_name || '',
        username:  meta.username  || null,
        phone:     meta.phone     || '',
        role:      'budtender',
        branch:    'PTK',
        avatar:    '👤',
      }, { onConflict: 'id', ignoreDuplicates: false });
      if (error) console.warn('[DANK] profile upsert:', error.message);
    } catch (err) { console.warn('[DANK] _upsertProfile (non-fatal):', err); }
  },
};

// ─────────────────────────────────────────────────────────────
// AUTH GUARD
// ─────────────────────────────────────────────────────────────
const AuthGuard = {

  // Protected pages: hide → check session → show or redirect
  // Page must have <script>document.documentElement.style.visibility='hidden'</script>
  // as the VERY FIRST script in <head> before SDKs load
  async protect() {
    const session = await AuthService.getSession();
    if (!session) {
      window.location.replace(AUTH_CONFIG.loginPage);
      return false;
    }
    document.documentElement.style.visibility = 'visible';
    return true;
  },

  // Login/signup pages: redirect away if already signed in
  async redirectIfAuth() {
    const session = await AuthService.getSession();
    if (session) { window.location.replace(AUTH_CONFIG.dashPage); return true; }
    return false;
  },

  // Populate header: authUserName, authUserRole, authUserBranch, authUserAvatar
  async injectUserUI() {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) return;
      const profile = await AuthService.getProfile(user.id);
      const m       = _mergeUserProfile(user, profile);
      const set     = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || ''; };
      set('authUserName',   m.name);
      set('authUserRole',   m.role.replace(/_/g, ' ').toUpperCase());
      set('authUserBranch', m.branch);
      set('authUserAvatar', m.avatar);
    } catch (err) { console.warn('[DANK] injectUserUI:', err); }
  },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function _mergeUserProfile(authUser, profile) {
  const meta = authUser.user_metadata || {};
  return {
    id:       authUser.id,
    email:    authUser.email,
    name:     profile?.full_name || meta.full_name || authUser.email,
    username: profile?.username  || meta.username  || '',
    phone:    profile?.phone     || meta.phone     || '',
    role:     profile?.role      || 'budtender',
    branch:   profile?.branch    || 'PTK',
    avatar:   profile?.avatar    || '👤',
  };
}

function _mapError(msg) {
  if (!msg) return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials'))   return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (m.includes('email not confirmed'))         return 'ยังไม่ยืนยันอีเมล — กรุณาตรวจสอบกล่องจดหมาย';
  if (m.includes('user already registered'))     return 'อีเมลนี้ลงทะเบียนแล้ว — กรุณา Login';
  if (m.includes('password should be'))          return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  if (m.includes('weak password'))               return 'รหัสผ่านไม่แข็งแรงพอ — เพิ่มตัวเลข/อักขระพิเศษ';
  if (m.includes('token has expired'))           return 'รหัส OTP หมดอายุ — กดส่งใหม่';
  if (m.includes('otp') || m.includes('token') || m.includes('invalid'))
                                                 return 'รหัส OTP ไม่ถูกต้อง — ลองใหม่';
  if (m.includes('rate limit') || m.includes('too many'))
                                                 return 'ส่งคำขอบ่อยเกินไป — รอสักครู่';
  if (m.includes('email rate limit'))            return 'ส่งอีเมลบ่อยเกินไป — รอ 60 วินาที';
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch'))
                                                 return 'เชื่อมต่อไม่ได้ — ตรวจสอบอินเทอร์เน็ต';
  return msg;
}

if (typeof window !== 'undefined') {
  window.AuthService = AuthService;
  window.AuthGuard   = AuthGuard;
  window.AUTH_CONFIG = AUTH_CONFIG;
}
if (typeof module !== 'undefined') {
  module.exports = { AuthService, AuthGuard, AUTH_CONFIG };
}
