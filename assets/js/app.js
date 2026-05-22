import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
// Note: In a real production environment, these should be environment variables.
// For Netlify deployment, you can inject them or use a build step.
// For this vanilla JS demo, replace these with your actual Supabase URL and Anon Key.
const SUPABASE_URL = 'https://seztjsmsmpufglzevnwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlenRqc21zbXB1ZmdsemV2bnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjA0MDIsImV4cCI6MjA5NDA5NjQwMn0.D1VD33-xhOutdNq0-KRYogxtrMuSeNDRktf-x-UD9t8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI Utilities

export const UI = {
  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - 'success', 'error', or 'info'
   */
  showToast(message, type = 'success') {
    // Create container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    let icon = '';
    if (type === 'success') {
      icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slide-up 0.3s ease-in reverse forwards';
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300);
    }, 3000);
  },

  /**
   * Format a date string into relative time (e.g. "2 days ago")
   */
  timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      if (diffInSeconds >= secondsInUnit) {
        const value = Math.floor(diffInSeconds / secondsInUnit);
        return `${value} ${unit}${value > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  },

  /**
   * Format currency (GHS)
   */
  formatCurrency(amount) {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      maximumFractionDigits: 0
    }).format(amount);
  },

  /**
   * Generate a fallback avatar with initials
   */
  getInitialsAvatar(name) {
    if (!name) return '';
    const initials = name.substring(0, 2).toUpperCase();
    return `https://ui-avatars.com/api/?name=${initials}&background=0F766E&color=fff&size=128&font-size=0.4`;
  }
};

// Initialization
function initApp() {
  // 1. Theme Toggle
  const themeToggle = document.getElementById('themeToggle');

  // Check for saved theme or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }

  // 2. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navLinks.classList.toggle('active');
    });
  }

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navLinks && navLinks.classList.contains('active') &&
      !e.target.closest('.nav-links') &&
      !e.target.closest('.mobile-menu-btn')) {
      navLinks.classList.remove('active');
    }
  });

  // 3. Scroll Reveal Observer
  const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');
  if (revealElements.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    
    revealElements.forEach(el => revealObserver.observe(el));
  }

  // 4. Account Button — update based on auth session
  const accountBtn = document.getElementById('accountBtn');
  if (accountBtn) {
    const updateAuthUI = (session) => {
      let logoutBtn = document.getElementById('globalLogoutBtn');
      if (session) {
        accountBtn.textContent = 'Dashboard';
        accountBtn.href = '/pages/dashboard.html';
        
        if (!logoutBtn) {
          logoutBtn = document.createElement('button');
          logoutBtn.id = 'globalLogoutBtn';
          logoutBtn.className = 'btn btn-outline';
          logoutBtn.style.padding = '0.5rem 1.25rem';
          logoutBtn.style.fontSize = '0.9rem';
          logoutBtn.style.marginLeft = '0.5rem';
          logoutBtn.textContent = 'Sign Out';
          logoutBtn.addEventListener('click', async () => {
             const { error } = await supabase.auth.signOut();
             if (error) {
               UI.showToast('Failed to log out', 'error');
             } else {
               UI.showToast('Logged out successfully', 'success');
             }
          });
          accountBtn.parentNode.insertBefore(logoutBtn, accountBtn.nextSibling);
        }
      } else {
        accountBtn.textContent = 'Sign In';
        accountBtn.href = '/pages/login.html';
        if (logoutBtn) logoutBtn.remove();
      }
    };

    // Check immediately on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthUI(session);
    });

    // Also react to live auth changes (login / logout)
    supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthUI(session);
    });
  }

  // 5. PWA Registration & Install Prompt
  if ('serviceWorker' in navigator) {
    // We register the SW even outside window load for fast loading
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  }

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Update UI to notify the user they can install the PWA
    const navLinks = document.getElementById('navLinks');
    if (navLinks && !document.getElementById('pwaInstallBtn')) {
      const installBtn = document.createElement('button');
      installBtn.id = 'pwaInstallBtn';
      installBtn.className = 'btn btn-outline';
      installBtn.style.padding = '0.5rem 1rem';
      installBtn.style.fontSize = '0.875rem';
      installBtn.style.marginLeft = '0.5rem';
      installBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 0.25rem;">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Install App
      `;
      
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          installBtn.remove();
        }
        deferredPrompt = null;
      });
      
      // Insert before the account button or at the end
      const accBtn = document.getElementById('accountBtn');
      if (accBtn) {
        navLinks.insertBefore(installBtn, accBtn);
      } else {
        navLinks.appendChild(installBtn);
      }
    }
  });

  window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) installBtn.remove();
    deferredPrompt = null;
    UI.showToast('App installed successfully!', 'success');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
