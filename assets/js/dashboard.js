import { supabase, UI } from './app.js';
import { Auth } from './auth.js';
import { Jobs } from './jobs.js';

export const Dashboard = {
  /**
   * Fetch aggregate stats for the dashboard
   */
  async getStats() {
    try {
      const { count: totalJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*', { count: 'estimated', head: true });
        
      if (jobsError) throw jobsError;
      
      // We could do more complex queries for other stats, 
      // but for this MVP we'll just return total jobs and some placeholders
      
      return {
        totalJobs: totalJobs || 0,
        activeCompanies: Math.floor(totalJobs * 0.8) || 0, // Placeholder calculation
        totalViews: (totalJobs * 42) || 0, // Placeholder
        error: null
      };
    } catch (error) {
      console.error('Error fetching stats:', error.message);
      return { error: error.message };
    }
  },

  /**
   * Add a new job
   */
  async addJob(jobData) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select();

      if (error) throw error;
      
      UI.showToast('Job posted successfully', 'success');
      return { job: data[0], error: null };
    } catch (error) {
      console.error('Error adding job:', error.message);
      UI.showToast('Failed to post job: ' + error.message, 'error');
      return { job: null, error: error.message };
    }
  },

  /**
   * Update an existing job
   */
  async updateJob(id, jobData) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', id)
        .select();

      if (error) throw error;
      
      UI.showToast('Job updated successfully', 'success');
      return { job: data[0], error: null };
    } catch (error) {
      console.error('Error updating job:', error.message);
      UI.showToast('Failed to update job: ' + error.message, 'error');
      return { job: null, error: error.message };
    }
  },

  /**
   * Delete a job
   */
  async deleteJob(id) {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      UI.showToast('Job deleted successfully', 'success');
      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting job:', error.message);
      UI.showToast('Failed to delete job: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  },

  /**
   * Upload a company logo to Supabase Storage
   * @param {File} file - The image file
   * @returns {Promise<string|null>} Public URL of the uploaded image
   */
  async uploadLogo(file) {
    if (!file) return null;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      UI.showToast('File size must be less than 2MB', 'error');
      return null;
    }

    console.log('[Logo] File:', file.name, '| Size:', file.size, '| Type:', file.type);

    try {
      // Verify auth session is active
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.error('[Logo] Session error:', sessionError.message);
      console.log('[Logo] Session active:', !!session, '| User:', session?.user?.id);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      console.log('[Logo] Uploading to: company_logos/' + fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company_logos')
        .upload(fileName, file, { upsert: true });

      console.log('[Logo] Upload response:', uploadData, uploadError);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company_logos')
        .getPublicUrl(fileName);

      console.log('[Logo] Public URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('[Logo] FAILED:', error);
      UI.showToast('Failed to upload logo: ' + error.message, 'error');
      return null;
    }
  },

  /**
   * Upload a user avatar to Supabase Storage
   * @param {File} file - The image file
   * @param {string} userId - The user's ID for namespacing
   * @returns {Promise<string|null>} Public URL of the uploaded image
   */
  async uploadAvatar(file, userId) {
    if (!file) return null;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      UI.showToast('File size must be less than 2MB', 'error');
      return null;
    }

    console.log('[Avatar] File:', file.name, '| Size:', file.size, '| Type:', file.type);
    console.log('[Avatar] User ID:', userId);

    try {
      // Verify auth session is active
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.error('[Avatar] Session error:', sessionError.message);
      console.log('[Avatar] Session active:', !!session, '| Role:', session?.user?.role);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      console.log('[Avatar] Uploading to: avatars/' + fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      console.log('[Avatar] Upload response:', uploadData, uploadError);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('[Avatar] Public URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('[Avatar] FAILED:', error);
      UI.showToast('Failed to upload avatar: ' + error.message, 'error');
      return null;
    }
  },

  /**
   * Fetch User Profile
   */
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') throw error;
      return { profile: data, error: null };
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      return { profile: null, error: error.message };
    }
  },

  /**
   * Update User Profile
   */
  async updateProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Profile save returned no data — check RLS policies.');
      UI.showToast('Profile updated successfully', 'success');
      return { profile: data[0], error: null };
    } catch (error) {
      console.error('Error updating profile:', error.message);
      UI.showToast('Failed to update profile: ' + error.message, 'error');
      return { profile: null, error: error.message };
    }
  },

  /**
   * Initialize Dashboard UI Logic
   */
  async init() {
    // --- 1. AUTH CHECK ---
    let user;
    try {
      user = await Auth.requireAuth();
      if (!user) return; // Redirecting to login...
    } catch (err) {
      console.error('[Dashboard] Auth check failed:', err);
      window.location.href = '/pages/login.html';
      return;
    }

    // --- 2. LOGOUT BUTTON (wired up first, no async dependency) ---
    try {
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        // Remove any listener attached by the emergency fallback in dashboard.html
        const freshBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(freshBtn, logoutBtn);
        freshBtn.addEventListener('click', (e) => {
          e.preventDefault();
          Auth.signOut();
        });
      }
    } catch (err) {
      console.warn('[Dashboard] Logout wiring failed:', err);
    }

    // --- 3. SIDEBAR TOGGLE ---
    try {
      const sidebarToggle = document.getElementById('sidebarToggle');
      const sidebar = document.querySelector('.dashboard-sidebar');
      const overlay = document.querySelector('.dashboard-overlay');
      if (sidebarToggle && sidebar && overlay) {
        const toggleSidebar = () => {
          sidebar.classList.toggle('active');
          overlay.classList.toggle('active');
        };
        sidebarToggle.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
      }
    } catch (err) {
      console.warn('[Dashboard] Sidebar toggle wiring failed:', err);
    }

    // --- 4. TAB SWITCHING ---
    try {
      const navJobs = document.getElementById('navJobs');
      const navProfile = document.getElementById('navProfile');
      const navApplications = document.getElementById('navApplications');
      const navSavedJobs = document.getElementById('navSavedJobs');

      const viewJobs = document.getElementById('viewJobs');
      const viewProfile = document.getElementById('viewProfile');
      const viewApplications = document.getElementById('viewApplications');
      const viewSavedJobs = document.getElementById('viewSavedJobs');

      const sidebar = document.querySelector('.dashboard-sidebar');
      const overlay = document.querySelector('.dashboard-overlay');

      const allNavs = [navJobs, navProfile, navApplications, navSavedJobs].filter(Boolean);
      const allViews = [viewJobs, viewProfile, viewApplications, viewSavedJobs].filter(Boolean);

      const switchTab = (activeNav, activeView) => {
        allNavs.forEach(nav => nav.classList.remove('active'));
        allViews.forEach(view => view.style.display = 'none');
        activeNav.classList.add('active');
        activeView.style.display = 'block';

        if (activeNav === navSavedJobs) {
          this.loadSavedJobs(user.id);
        } else if (activeNav === navApplications) {
          this.loadApplications(user.id);
        } else if (activeNav === navJobs) {
          if (window.loadJobsTable) window.loadJobsTable();
        }

        if (sidebar && overlay && window.innerWidth <= 1024) {
          sidebar.classList.remove('active');
          overlay.classList.remove('active');
        }
      };

      if (navJobs && viewJobs) navJobs.addEventListener('click', (e) => { e.preventDefault(); switchTab(navJobs, viewJobs); });
      if (navProfile && viewProfile) navProfile.addEventListener('click', (e) => { e.preventDefault(); switchTab(navProfile, viewProfile); });
      if (navApplications && viewApplications) navApplications.addEventListener('click', (e) => { e.preventDefault(); switchTab(navApplications, viewApplications); });
      if (navSavedJobs && viewSavedJobs) navSavedJobs.addEventListener('click', (e) => { e.preventDefault(); switchTab(navSavedJobs, viewSavedJobs); });
    } catch (err) {
      console.warn('[Dashboard] Tab wiring failed:', err);
    }

    // --- 5. PROFILE FORM (isolated — failure here never blocks logout or nav) ---
    try {
      const profileForm = document.getElementById('profileForm');
      if (profileForm) {
        // Load profile with a 5s timeout so a dead network doesn't hang the page
        let profile = null;
        try {
          const profilePromise = this.getProfile(user.id);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timed out')), 5000)
          );
          const result = await Promise.race([profilePromise, timeoutPromise]);
          profile = result?.profile || null;
        } catch (fetchErr) {
          console.warn('[Dashboard] Profile fetch failed or timed out:', fetchErr.message);
        }

        // Bulletproof: always populate from the best available source
        const fullName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
        const email = profile?.contact_email || user.email || '';
        const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        const phone = profile?.phone || user.phone || '';
        const bio = profile?.bio || '';

        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        const phoneEl = document.getElementById('profilePhone');
        const bioEl = document.getElementById('profileBio');
        const avatarUrlEl = document.getElementById('profileAvatarUrl');
        const avatarPreview = document.getElementById('profileAvatarPreview');

        if (nameEl) nameEl.value = fullName;
        if (emailEl) emailEl.value = email;
        if (phoneEl) phoneEl.value = phone;
        if (bioEl) bioEl.value = bio;

        if (avatarUrl && avatarUrlEl) avatarUrlEl.value = avatarUrl;
        if (avatarUrl && avatarPreview) {
          avatarPreview.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }

        // Avatar upload
        const avatarUpload = document.getElementById('profileAvatarUpload');
        if (avatarUpload) {
          avatarUpload.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
              const preview = document.getElementById('profileAvatarPreview');
              if (preview) preview.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-secondary);">Uploading...</span>`;
              const uploadUrl = await this.uploadAvatar(e.target.files[0], user.id);
              if (uploadUrl) {
                if (avatarUrlEl) avatarUrlEl.value = uploadUrl;
                if (preview) preview.innerHTML = `<img src="${uploadUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
              } else {
                if (preview) preview.innerHTML = `<span style="font-size: 0.75rem; color: var(--error);">Upload failed</span>`;
              }
            }
          });
        }

        // Save profile
        profileForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const saveBtn = document.getElementById('saveProfileBtn');
          if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

          const profileData = {
            id: user.id,
            full_name: nameEl?.value || '',
            contact_email: emailEl?.value || '',
            phone: phoneEl?.value || '',
            bio: bioEl?.value || '',
            avatar_url: avatarUrlEl?.value || ''
          };

          const { profile: saved, error: saveError } = await this.updateProfile(profileData);

          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Profile'; }

          // Re-sync form fields from the DB-returned row so the UI always
          // reflects what was actually persisted, not just what was typed.
          if (saved && !saveError) {
            if (nameEl)      nameEl.value      = saved.full_name      || '';
            if (emailEl)     emailEl.value     = saved.contact_email  || '';
            if (phoneEl)     phoneEl.value     = saved.phone          || '';
            if (bioEl)       bioEl.value       = saved.bio            || '';
            if (avatarUrlEl) avatarUrlEl.value = saved.avatar_url     || '';
            if (saved.avatar_url && avatarPreview) {
              avatarPreview.innerHTML = `<img src="${saved.avatar_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            }
          }
        });
      }
    } catch (err) {
      console.warn('[Dashboard] Profile section failed:', err);
    }
  },


  async loadSavedJobs(userId) {
    const grid = document.getElementById('savedJobsGrid');
    if (!grid) return;
    
    grid.innerHTML = Jobs.renderSkeletons(3);
    const { savedJobs, error } = await Jobs.getSavedJobs(userId);
    
    if (error) {
      grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--error);">Error loading saved jobs</div>`;
      return;
    }
    
    if (!savedJobs || savedJobs.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">No saved jobs yet. <br><a href="/pages/jobs.html" style="color: var(--primary); font-weight: 500; margin-top: 1rem; display: inline-block;">Browse Jobs</a></div>`;
      return;
    }
    
    grid.innerHTML = savedJobs.map(sj => Jobs.renderJobCard(sj.jobs, true)).join('');
  },

  async loadApplications(userId) {
    const tbody = document.getElementById('applicationsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">Loading applications...</td></tr>`;
    const { applications, error } = await Jobs.getApplications(userId);
    
    if (error) {
      tbody.innerHTML = `<tr><td colspan="5" style="color: var(--error); text-align: center;">Error loading applications</td></tr>`;
      return;
    }
    
    if (!applications || applications.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 3rem;">You haven't applied to any jobs yet.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = applications.map(app => {
      const job = app.jobs;
      if (!job) return '';
      
      let statusColor = '#3B82F6'; // Default blue (Applied)
      let statusBg = '#EFF6FF';
      
      if (app.status === 'Reviewed') {
        statusColor = '#8B5CF6'; statusBg = '#F5F3FF';
      } else if (app.status === 'Interview') {
        statusColor = '#F59E0B'; statusBg = '#FEF3C7';
      } else if (app.status === 'Hired') {
        statusColor = '#10B981'; statusBg = '#ECFDF5';
      } else if (app.status === 'Rejected') {
        statusColor = '#EF4444'; statusBg = '#FEF2F2';
      }
      
      return `
        <tr class="table-row-hover">
          <td style="font-weight: 500; color: var(--text-primary);">${job.title}</td>
          <td>${job.company}</td>
          <td class="text-secondary">${UI.timeAgo(app.created_at)}</td>
          <td>
            <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-block;">
              ${app.status}
            </span>
          </td>
          <td style="text-align: right;">
            <a href="/pages/job-details.html?id=${job.id}" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.875rem;">View Job</a>
          </td>
        </tr>
      `;
    }).join('');
  }
};
