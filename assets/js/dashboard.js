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
  async getProfile(userId, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, contact_email, avatar_url, phone, bio, profession, role, company, location, hometown, whatsapp, tekyel_name, extra_fields')
          .eq('id', userId)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') throw error;
        return { profile: data, error: null };
      } catch (error) {
        console.error(`Error fetching profile (attempt ${i + 1}):`, error.message);
        if (i === retries - 1) return { profile: null, error: error.message };
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // exponential backoff
      }
    }
  },

  /**
   * Update User Profile
   */
  async updateProfile(profileData) {
    try {
      // Strip empty strings — never overwrite existing DB values with blanks
      const cleanData = Object.fromEntries(
        Object.entries(profileData).filter(([key, val]) =>
          key === 'id' || (val !== '' && val !== null && val !== undefined)
        )
      );

      const { data, error } = await supabase
        .from('profiles')
        .upsert(cleanData, { onConflict: 'id' })
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
    // --- 0. CACHE & UI HELPER (instant synchronous load) ---
    const populateProfileUI = (data) => {
      // 1. Display Mode
      const displayName = document.getElementById('displayName');
      const displayEmail = document.getElementById('displayEmail');
      const displayPhone = document.getElementById('displayPhone');
      const displayBio = document.getElementById('displayBio');
      const displayAvatar = document.getElementById('displayAvatar');

      const displayProfession = document.getElementById('displayProfession');
      const displayRole = document.getElementById('displayRole');
      const displayCompany = document.getElementById('displayCompany');
      const displayLocation = document.getElementById('displayLocation');
      const displayHometown = document.getElementById('displayHometown');
      const displayWhatsapp = document.getElementById('displayWhatsapp');
      const displayTekyel = document.getElementById('displayTekyel');

      if (displayName) displayName.textContent = data.full_name || 'User Name';
      if (displayEmail) displayEmail.textContent = data.contact_email || 'user@example.com';
      if (displayPhone) displayPhone.textContent = data.phone || 'Not provided';
      if (displayProfession) displayProfession.textContent = data.profession || 'Not provided';
      if (displayRole) displayRole.textContent = data.role || 'Not provided';
      if (displayCompany) displayCompany.textContent = data.company || 'Not provided';
      if (displayLocation) displayLocation.textContent = data.location || 'Not provided';
      if (displayHometown) displayHometown.textContent = data.hometown || 'Not provided';
      if (displayWhatsapp) displayWhatsapp.textContent = data.whatsapp || 'Not provided';
      if (displayTekyel) displayTekyel.textContent = data.tekyel_name || 'Not provided';
      if (displayBio) displayBio.textContent = data.bio || 'Not provided';
      if (displayAvatar) {
        if (data.avatar_url) {
          displayAvatar.innerHTML = `<img src="${data.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
          displayAvatar.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--primary); color: white; border-radius: 50%; font-weight: bold;">${(data.full_name || data.contact_email || 'U').charAt(0).toUpperCase()}</div>`;
        }
      }

      // 2. Edit Mode
      const nameEl = document.getElementById('profileName');
      const emailEl = document.getElementById('profileEmail');
      const phoneEl = document.getElementById('profilePhone');
      const bioEl = document.getElementById('profileBio');
      const professionEl = document.getElementById('profileProfession');
      const roleEl = document.getElementById('profileRole');
      const companyEl = document.getElementById('profileCompany');
      const locationEl = document.getElementById('profileLocation');
      const hometownEl = document.getElementById('profileHometown');
      const whatsappEl = document.getElementById('profileWhatsapp');
      const tekyelEl = document.getElementById('profileTekyel');
      const avatarUrlEl = document.getElementById('profileAvatarUrl');
      const avatarPreview = document.getElementById('profileAvatarPreview');

      if (nameEl) nameEl.value = data.full_name || '';
      if (emailEl) emailEl.value = data.contact_email || '';
      if (phoneEl) phoneEl.value = data.phone || '';
      if (professionEl) professionEl.value = data.profession || '';
      if (roleEl) roleEl.value = data.role || '';
      if (companyEl) companyEl.value = data.company || '';
      if (locationEl) locationEl.value = data.location || '';
      if (hometownEl) hometownEl.value = data.hometown || '';
      if (whatsappEl) whatsappEl.value = data.whatsapp || '';
      if (tekyelEl) tekyelEl.value = data.tekyel_name || '';
      if (bioEl) bioEl.value = data.bio || '';
      if (avatarUrlEl) avatarUrlEl.value = data.avatar_url || '';
      if (data.avatar_url && avatarPreview) {
        avatarPreview.innerHTML = `<img src="${data.avatar_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      }

      // 4. Extra Fields Display & Edit
      const displayExtraFields = document.getElementById('displayExtraFields');
      const extraContainer = document.getElementById('extraFieldsContainer');
      let extras = [];
      try {
        extras = Array.isArray(data.extra_fields) ? data.extra_fields : (data.extra_fields ? JSON.parse(data.extra_fields) : []);
      } catch(e) { extras = []; }

      // Render in display mode
      if (displayExtraFields) {
        if (extras.length > 0) {
          displayExtraFields.innerHTML = `
            <div class="profile-grid" style="margin-top:0;">
              ${extras.map(f => `
                <div class="profile-card">
                  <div class="profile-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                  </div>
                  <div class="profile-card-content">
                    <h4 style="font-size:0.75rem;color:var(--primary);text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.35rem 0;font-weight:700;">${f.label}</h4>
                    <p style="font-size:1rem;color:var(--text-primary);margin:0;font-weight:600;word-break:break-word;">${f.value}</p>
                  </div>
                </div>`).join('')}
            </div>`;
        } else {
          displayExtraFields.innerHTML = '';
        }
      }

      // Populate edit form rows
      if (extraContainer) {
        extraContainer.innerHTML = '';
        extras.forEach((f, i) => addExtraFieldRow(f.label, f.value));
      }
    };

    // Helper: add a dynamic extra field row to the edit form
    const addExtraFieldRow = (label = '', value = '') => {
      const container = document.getElementById('extraFieldsContainer');
      if (!container) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:0.5rem;align-items:center;';
      row.innerHTML = `
        <input type="text" placeholder="Label (e.g. LinkedIn)" value="${label}" class="form-control extra-field-label" style="flex:1;">
        <input type="text" placeholder="Value / URL" value="${value}" class="form-control extra-field-value" style="flex:2;">
        <button type="button" class="remove-extra-field" style="background:none;border:none;color:#EF4444;cursor:pointer;padding:0.4rem;border-radius:var(--radius-md);" title="Remove">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>`;
      row.querySelector('.remove-extra-field').addEventListener('click', () => row.remove());
      container.appendChild(row);
    };


    try {
      const cached = localStorage.getItem('jb_profile_cache');
      if (cached) {
        populateProfileUI(JSON.parse(cached));
      }
    } catch(e) {
      console.warn('Failed to parse profile cache', e);
    }

    let user = null;

    // --- 1. LOGOUT BUTTON (wired up first, completely synchronous) ---
    try {
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
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

    // --- 2. SIDEBAR TOGGLE (synchronous) ---
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

    // --- 3. TAB SWITCHING (synchronous binding) ---
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

        if (activeNav === navSavedJobs && user) {
          this.loadSavedJobs(user.id);
        } else if (activeNav === navApplications && user) {
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

    // --- 4b. ADD EXTRA FIELD BUTTON ---
    try {
      const addExtraBtn = document.getElementById('addExtraFieldBtn');
      if (addExtraBtn) {
        addExtraBtn.addEventListener('click', () => addExtraFieldRow());
      }
    } catch(err) {
      console.warn('[Dashboard] Add extra field button wiring failed:', err);
    }

    // --- 4. PROFILE FORM SUBMIT HANDLER (synchronous binding) ---
    try {
      const profileForm = document.getElementById('profileForm');
      if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!user) return;

          const saveBtn = document.getElementById('saveProfileBtn');
          if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

          const nameEl = document.getElementById('profileName');
          const emailEl = document.getElementById('profileEmail');
          const phoneEl = document.getElementById('profilePhone');
          const professionEl = document.getElementById('profileProfession');
          const roleEl = document.getElementById('profileRole');
          const companyEl = document.getElementById('profileCompany');
          const locationEl = document.getElementById('profileLocation');
          const hometownEl = document.getElementById('profileHometown');
          const whatsappEl = document.getElementById('profileWhatsapp');
          const tekyelEl = document.getElementById('profileTekyel');
          const bioEl = document.getElementById('profileBio');
          const avatarUrlEl = document.getElementById('profileAvatarUrl');
          const avatarPreview = document.getElementById('profileAvatarPreview');

          // Build profile data — only include non-empty values so we never
          // accidentally overwrite existing DB data with blank form fields.
          const profileData = { id: user.id };
          if (nameEl?.value?.trim())    profileData.full_name     = nameEl.value.trim();
          if (emailEl?.value?.trim())   profileData.contact_email = emailEl.value.trim();
          if (phoneEl?.value?.trim())   profileData.phone         = phoneEl.value.trim();
          if (professionEl?.value?.trim()) profileData.profession = professionEl.value.trim();
          if (roleEl?.value?.trim())       profileData.role       = roleEl.value.trim();
          if (companyEl?.value?.trim())    profileData.company    = companyEl.value.trim();
          if (locationEl?.value?.trim())   profileData.location   = locationEl.value.trim();
          if (hometownEl?.value?.trim())   profileData.hometown   = hometownEl.value.trim();
          if (whatsappEl?.value?.trim())   profileData.whatsapp   = whatsappEl.value.trim();
          if (tekyelEl?.value?.trim())     profileData.tekyel_name = tekyelEl.value.trim();
          if (bioEl?.value?.trim())     profileData.bio           = bioEl.value.trim();
          if (avatarUrlEl?.value?.trim()) profileData.avatar_url  = avatarUrlEl.value.trim();

          // Collect extra fields
          const extraRows = document.querySelectorAll('#extraFieldsContainer > div');
          const extraFields = [];
          extraRows.forEach(row => {
            const label = row.querySelector('.extra-field-label')?.value?.trim();
            const value = row.querySelector('.extra-field-value')?.value?.trim();
            if (label && value) extraFields.push({ label, value });
          });
          profileData.extra_fields = extraFields;

          const { profile: saved, error: saveError } = await this.updateProfile(profileData);

          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Profile'; }

          if (saved && !saveError) {
            localStorage.setItem('jb_profile_cache', JSON.stringify(saved));
            populateProfileUI(saved);

            // Return to display mode
            const toggleBtn = document.getElementById('toggleEditProfileBtn');
            const displayMode = document.getElementById('profileDisplayMode');
            const editMode = document.getElementById('profileEditMode');
            if (editMode && displayMode && toggleBtn) {
               editMode.style.display = 'none';
               displayMode.style.display = 'block';
               toggleBtn.style.display = 'block';
            }
          }
        });
      }
    } catch (err) {
      console.warn('[Dashboard] Profile form submit wiring failed:', err);
    }

    // --- 5. AUTH CHECK (Asynchronous barrier) ---
    try {
      user = await Auth.requireAuth();
      if (!user) return; // Redirecting to login...
    } catch (err) {
      console.error('[Dashboard] Auth check failed:', err);
      window.location.href = '/pages/login.html';
      return;
    }

    // --- 6. LOAD PROFILE DATA ---
    try {
      const profileForm = document.getElementById('profileForm');
      if (profileForm) {
        // Fetch profile from DB
        let { profile } = await this.getProfile(user.id);

        // If no row exists yet (new user), create one from auth metadata — safely
        if (!profile) {
          console.log('[Dashboard] No profile row — creating from auth metadata');
          const seed = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            contact_email: user.email || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            phone: null,
            bio: null
          };
          // ignoreDuplicates: true = INSERT ... ON CONFLICT DO NOTHING
          // This means we NEVER overwrite an existing row even if getProfile failed
          await supabase.from('profiles').upsert(seed, { onConflict: 'id', ignoreDuplicates: true });
          const { profile: refetched } = await this.getProfile(user.id);
          if (refetched) profile = refetched;
        }

        // Use profile data, fallback to auth metadata if DB fields are still empty.
        // Also merge with any locally-cached data so new fields are never lost
        // if the DB schema cache hasn't refreshed yet.
        let cachedProfile = {};
        try {
          const raw = localStorage.getItem('jb_profile_cache');
          if (raw) cachedProfile = JSON.parse(raw);
        } catch(e) {}

        const finalProfile = {
          ...cachedProfile,
          ...profile,
          full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || cachedProfile.full_name || '',
          contact_email: profile?.contact_email || user.email || cachedProfile.contact_email || '',
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || cachedProfile.avatar_url || '',
          phone: profile?.phone || user.phone || cachedProfile.phone || '',
          profession: profile?.profession || cachedProfile.profession || '',
          role: profile?.role || cachedProfile.role || '',
          company: profile?.company || cachedProfile.company || '',
          location: profile?.location || cachedProfile.location || '',
          hometown: profile?.hometown || cachedProfile.hometown || '',
          whatsapp: profile?.whatsapp || cachedProfile.whatsapp || '',
          tekyel_name: profile?.tekyel_name || cachedProfile.tekyel_name || '',
          bio: profile?.bio || cachedProfile.bio || '',
          extra_fields: profile?.extra_fields ?? cachedProfile.extra_fields ?? []
        };

        // Cache and render
        localStorage.setItem('jb_profile_cache', JSON.stringify(finalProfile));
        populateProfileUI(finalProfile);

        // Toggle logic
        const toggleBtn = document.getElementById('toggleEditProfileBtn');
        const cancelBtn = document.getElementById('cancelEditProfileBtn');
        const displayMode = document.getElementById('profileDisplayMode');
        const editMode = document.getElementById('profileEditMode');

        if (toggleBtn && cancelBtn && displayMode && editMode) {
          toggleBtn.addEventListener('click', () => {
            displayMode.style.display = 'none';
            editMode.style.display = 'block';
            toggleBtn.style.display = 'none';
          });
          cancelBtn.addEventListener('click', () => {
            editMode.style.display = 'none';
            displayMode.style.display = 'block';
            toggleBtn.style.display = 'block';
          });
        }
        


        // Avatar upload listener
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
                if (headerAvatar) {
                  headerAvatar.innerHTML = `<img src="${uploadUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                }
              } else {
                if (preview) preview.innerHTML = `<span style="font-size: 0.75rem; color: var(--error);">Upload failed</span>`;
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('[Dashboard] Profile data loading failed:', err);
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
