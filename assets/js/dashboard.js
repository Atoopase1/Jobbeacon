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
        .select('*', { count: 'exact', head: true });
        
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

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company_logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company_logos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error.message);
      UI.showToast('Failed to upload logo', 'error');
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
        .single();
        
      if (error) throw error;
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
        .upsert([profileData])
        .select();

      if (error) throw error;
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
    // Make sure user is authenticated
    const user = await Auth.requireAuth();
    if (!user) return; // Redirecting to login...

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.signOut();
      });
    }

    // Sidebar toggle (Mobile)
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

    // Tab Switching Logic
    const navJobs = document.getElementById('navJobs');
    const navProfile = document.getElementById('navProfile');
    const navApplications = document.getElementById('navApplications');
    const navSavedJobs = document.getElementById('navSavedJobs');
    
    const viewJobs = document.getElementById('viewJobs');
    const viewProfile = document.getElementById('viewProfile');
    const viewApplications = document.getElementById('viewApplications');
    const viewSavedJobs = document.getElementById('viewSavedJobs');

    const allNavs = [navJobs, navProfile, navApplications, navSavedJobs].filter(Boolean);
    const allViews = [viewJobs, viewProfile, viewApplications, viewSavedJobs].filter(Boolean);

    const switchTab = (activeNav, activeView) => {
      allNavs.forEach(nav => nav.classList.remove('active'));
      allViews.forEach(view => view.style.display = 'none');
      
      activeNav.classList.add('active');
      activeView.style.display = 'block';
      
      // Load specific tab data
      if (activeNav === navSavedJobs) {
        this.loadSavedJobs(user.id);
      } else if (activeNav === navApplications) {
        this.loadApplications(user.id);
      }
    };

    if (navJobs && viewJobs) navJobs.addEventListener('click', (e) => { e.preventDefault(); switchTab(navJobs, viewJobs); });
    if (navProfile && viewProfile) navProfile.addEventListener('click', (e) => { e.preventDefault(); switchTab(navProfile, viewProfile); });
    if (navApplications && viewApplications) navApplications.addEventListener('click', (e) => { e.preventDefault(); switchTab(navApplications, viewApplications); });
    if (navSavedJobs && viewSavedJobs) navSavedJobs.addEventListener('click', (e) => { e.preventDefault(); switchTab(navSavedJobs, viewSavedJobs); });

    // Profile Form Logic
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      // Load Profile Data
      const { profile } = await this.getProfile(user.id);
      if (profile) {
        document.getElementById('profileName').value = profile.full_name || '';
        document.getElementById('profileEmail').value = profile.contact_email || '';
        document.getElementById('profilePhone').value = profile.phone || '';
        document.getElementById('profileBio').value = profile.bio || '';
        
        if (profile.avatar_url) {
          document.getElementById('profileAvatarUrl').value = profile.avatar_url;
          document.getElementById('profileAvatarPreview').innerHTML = `<img src="${profile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
      }

      // Handle Avatar Upload
      const avatarUpload = document.getElementById('profileAvatarUpload');
      avatarUpload.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          // Re-use logo upload method for MVP simplicity
          const uploadUrl = await this.uploadLogo(e.target.files[0]);
          if (uploadUrl) {
            document.getElementById('profileAvatarUrl').value = uploadUrl;
            document.getElementById('profileAvatarPreview').innerHTML = `<img src="${uploadUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
          }
        }
      });

      // Handle Save Profile
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveProfileBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const profileData = {
          id: user.id,
          full_name: document.getElementById('profileName').value,
          contact_email: document.getElementById('profileEmail').value,
          phone: document.getElementById('profilePhone').value,
          bio: document.getElementById('profileBio').value,
          avatar_url: document.getElementById('profileAvatarUrl').value
        };

        await this.updateProfile(profileData);

        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile';
      });
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
