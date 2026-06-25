/**
 * DANK Cannabis Club — Dashboard / AI Command Center v2.1
 * Requires: config.js → supabase.js → auth.js
 *
 * Page MUST start with:
 *   <script>document.documentElement.style.visibility='hidden';</script>
 * AuthGuard.protect() reveals it after session is confirmed.
 */
'use strict';

// Role hierarchy — higher = more permissions
const ROLE_RANK = {
  owner:          100,
  branch_manager:  80,
  manager:         70,
  accountant:      60,
  marketing:       50,
  budtender:       40,
  kitchen:         30,
  delivery_rider:  20,
};

// ─────────────────────────────────────────────────────────────────
// ROLE GUARD
// ─────────────────────────────────────────────────────────────────
const RoleGuard = {
  _profile: null,

  async load() {
    if (this._profile) return this._profile;
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) return null;
    this._profile = await AuthService.getProfile(user.id);
    return this._profile;
  },

  async getRole()   { const p = await this.load(); return p?.role   || 'budtender'; },
  async getBranch() { const p = await this.load(); return p?.branch || 'PTK'; },

  async getRank() {
    const role = await this.getRole();
    return ROLE_RANK[role] || 0;
  },

  async atLeast(requiredRole) {
    const rank = await this.getRank();
    return rank >= (ROLE_RANK[requiredRole] || 0);
  },

  // Hide elements whose data-min-role isn't met
  async applyVisibility() {
    const rank = await this.getRank();
    document.querySelectorAll('[data-min-role]').forEach(el => {
      const min = el.getAttribute('data-min-role');
      const minRank = ROLE_RANK[min] || 0;
      el.style.display = rank >= minRank ? '' : 'none';
    });
  },

  // Disable (not hide) below threshold
  async hideIfBelow(requiredRole, selector) {
    const allowed = await this.atLeast(requiredRole);
    if (!allowed) {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
      });
    }
  },
};

// ─────────────────────────────────────────────────────────────────
// DASHBOARD INIT
// ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // Protect: hide → verify session → show or redirect
  const ok = await AuthGuard.protect();
  if (!ok) return;

  try {
    // Populate header with user info
    await AuthGuard.injectUserUI();

    // Apply role-based visibility
    await RoleGuard.applyVisibility();

    // Listen for auth state changes (logout from another tab, token refresh, etc.)
    getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.replace(AUTH_CONFIG.loginPage);
      }
      if (event === 'TOKEN_REFRESHED') {
        console.log('[DANK] Token refreshed silently');
      }
      if (event === 'USER_UPDATED') {
        AuthGuard.injectUserUI().catch(console.warn);
      }
    });

    // Update "last seen" timestamp
    updateLastSeen();

    // Init any page-specific modules
    if (typeof initDashboardModules === 'function') initDashboardModules();

  } catch (err) {
    console.error('[DANK] Dashboard init error:', err);
  }
});

// ─────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────
async function handleLogout() {
  try {
    const confirmed = await confirmDialog('ออกจากระบบ', 'ต้องการออกจากระบบใช่ไหม?');
    if (!confirmed) return;
  } catch (_) { /* no dialog — proceed */ }
  await AuthService.logout();
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function updateLastSeen() {
  const el = document.getElementById('lastSeen');
  if (!el) return;
  el.textContent = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date());
}

function confirmDialog(title, msg) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    if (!modal) { resolve(window.confirm(`${title}\n\n${msg}`)); return; }
    const titleEl = modal.querySelector('[data-confirm-title]');
    const msgEl   = modal.querySelector('[data-confirm-msg]');
    const okBtn   = modal.querySelector('[data-confirm-ok]');
    const cancelBtn = modal.querySelector('[data-confirm-cancel]');
    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent   = msg;
    modal.style.display = 'flex';
    const cleanup = () => { modal.style.display = 'none'; };
    okBtn?.addEventListener('click',     () => { cleanup(); resolve(true);  }, { once: true });
    cancelBtn?.addEventListener('click', () => { cleanup(); resolve(false); }, { once: true });
  });
}

// Expose globally for inline onclick= handlers in HTML
window.RoleGuard    = RoleGuard;
window.handleLogout = handleLogout;
window.ROLE_RANK    = ROLE_RANK;
