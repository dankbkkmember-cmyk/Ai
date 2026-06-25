/**
 * DANK Cannabis Club — Supabase Client Init v2.1
 * Reads credentials from config.js — nothing hardcoded here.
 *
 * LOAD ORDER (every HTML page):
 *   1. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   2. <script src="assets/js/config.js"></script>
 *   3. <script src="assets/js/supabase.js"></script>
 *   4. <script src="assets/js/auth.js"></script>
 *   5. <script src="assets/js/[page].js"></script>
 */
'use strict';

const SITE_CONFIG = {
  loginPage:  'login.html',
  signupPage: 'signup.html',
  verifyPage: 'verify-email.html',
  dashPage:   'dank-ai-center.html',
  forgotPage: 'forgot-password.html',
  resetPage:  'reset-password.html',
};

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;

  const url = window.DANK_SUPABASE_URL;
  const key = window.DANK_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('[DANK] config.js not loaded — Supabase credentials missing.');
  }
  if (!window.supabase?.createClient) {
    throw new Error('[DANK] Supabase SDK CDN script missing.');
  }

  _supabase = window.supabase.createClient(url, key, {
    auth: {
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: true,   // parses #access_token from password-reset emails
      storageKey:         'dank_auth_v2',
    },
  });

  return _supabase;
}

if (typeof window !== 'undefined') {
  window.getSupabase = getSupabase;
  window.SITE_CONFIG = SITE_CONFIG;
}
