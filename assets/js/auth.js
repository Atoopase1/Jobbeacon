import { supabase, UI } from './app.js';

const ADMIN_EMAILS = ['atoopase@gmail.com', 'www.atoopasechristopher@gmail.com'];

export const Auth = {
  /**
   * Check if user is currently logged in.
   * Uses getUser() for a server-validated check so we never rely on stale
   * localStorage data that could make the profile appear empty.
   * Falls back to getSession() if the network call fails.
   * @returns {Promise<Object|null>} User object or null
   */
  async getSession() {
    try {
      // Primary: server-validated (ensures fresh user object)
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) return user;

      // Fallback: cached session (offline / transient network blip)
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;
      return session ? session.user : null;
    } catch (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
  },

  isAdmin(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
  },

  /**
   * Sign up with email and password
   * @param {string} email 
   * @param {string} password 
   */
  async signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      UI.showToast('Account created successfully!', 'success');
      
      // Let onAuthStateChange handle the redirect after profile creation
      return data.user;
    } catch (error) {
      console.error('Sign up error:', error.message);
      UI.showToast(error.message || 'Failed to sign up', 'error');
      return null;
    }
  },

  /**
   * Sign in with email and password
   * @param {string} email 
   * @param {string} password 
   */
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      UI.showToast('Login successful!', 'success');
      
      // Let onAuthStateChange handle the redirect after profile creation/check
      return data.user;
    } catch (error) {
      console.error('Sign in error:', error.message);
      UI.showToast(error.message || 'Failed to sign in', 'error');
      return null;
    }
  },

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || '/pages/dashboard.html';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/pages/login.html?redirect=${encodeURIComponent(redirect)}`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Google sign-in error:', error.message);
      UI.showToast(error.message || 'Failed to sign in with Google', 'error');
      return null;
    }
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      localStorage.removeItem('jb_profile_cache');
      
      UI.showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);
    } catch (error) {
      console.error('Sign out error:', error.message);
      UI.showToast('Failed to log out', 'error');
    }
  },

  /**
   * Protect a route - redirects to login if not authenticated
   */
  async requireAuth() {
    const user = await this.getSession();
    
    if (!user) {
      // Not logged in, redirect to login page
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/pages/login.html?redirect=${currentUrl}`;
      return null;
    }
    
    return user;
  },

  /**
   * Redirect to dashboard if already logged in (used on login page)
   */
  async redirectIfAuthenticated() {
    const user = await this.getSession();
    if (user) {
      window.location.href = '/pages/dashboard.html';
    }
  }
};

// Initialize auth state listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    const user = session.user;

    // Handle OAuth redirect callback (e.g. Google sign-in)
    const isLoginPage = window.location.pathname.includes('/login.html');
    if (isLoginPage) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || '/pages/dashboard.html';
      window.location.href = redirect;
    }
  }

  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    const isProtected = window.location.pathname.includes('/dashboard.html');
    if (isProtected) {
      window.location.href = '/pages/login.html';
    }
  }
});
