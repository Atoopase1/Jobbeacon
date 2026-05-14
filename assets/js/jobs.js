import { supabase, UI } from './app.js';

export const Jobs = {
  /**
   * Fetch jobs with optional filtering and pagination
   */
  async getJobs(options = {}) {
    const {
      page = 1,
      limit = 12,
      search = '',
      location = '',
      category = '',
      type = '',
      featuredOnly = false,
      userId = null,
      postType = ''
    } = options;

    try {
      let query = supabase
        .from('jobs')
        .select('*', { count: 'estimated' });

      // Apply filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
      }
      if (location) query = query.eq('location', location);
      if (category) query = query.eq('category', category);
      if (type) query = query.eq('type', type);
      if (postType) query = query.eq('post_type', postType);
      if (userId) query = query.eq('user_id', userId);
      
      // Order by latest
      query = query.order('created_at', { ascending: false });

      // Pagination
      if (limit > 0) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return { jobs: data, count, error: null };
    } catch (error) {
      console.error('Error fetching jobs:', error.message);
      return { jobs: [], count: 0, error: error.message };
    }
  },

  /**
   * Get a single job by ID
   */
  async getJobById(id) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return { job: data, error: null };
    } catch (error) {
      console.error('Error fetching job:', error.message);
      return { job: null, error: error.message };
    }
  },

  /**
   * Application & Saved Job Methods
   */
  async saveJob(jobId, userId) {
    try {
      const { data, error } = await supabase
        .from('saved_jobs')
        .insert([{ job_id: jobId, user_id: userId }]);
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Error saving job:', error.message);
      return { success: false, error: error.message };
    }
  },

  async unsaveJob(jobId, userId) {
    try {
      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .match({ job_id: jobId, user_id: userId });
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Error unsaving job:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getSavedJobs(userId) {
    try {
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          id,
          job_id,
          jobs (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { savedJobs: data, error: null };
    } catch (error) {
      console.error('Error fetching saved jobs:', error.message);
      return { savedJobs: [], error: error.message };
    }
  },

  async getApplications(userId) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          jobs (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return { applications: data, error: null };
    } catch (error) {
      console.error('Error fetching applications:', error.message);
      return { applications: [], error: error.message };
    }
  },

  async applyForJob(jobId, userId, coverNote) {
    try {
      const { error } = await supabase
        .from('applications')
        .insert([{ job_id: jobId, user_id: userId, cover_note: coverNote }]);
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Error applying for job:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Render a job card HTML string
   */
  renderJobCard(job, isSaved = false) {
    const logoUrl = job.company_logo || UI.getInitialsAvatar(job.company);
    const formattedSalary = UI.formatCurrency(job.salary);
    const postedTimeAgo = UI.timeAgo(job.created_at);
    
    // Type badge class
    let typeClass = 'badge-secondary';
    if (job.type === 'Remote') typeClass = 'badge-primary';
    else if (job.type === 'Full-time') typeClass = 'badge-secondary';

    // Post Type logic
    const isSeeking = job.post_type === 'seeking';
    const postTypeBadge = isSeeking 
      ? `<span class="badge" style="background-color: #F3E8FF; color: #7E22CE; font-weight: 600; border: 1px solid #D8B4FE;">CANDIDATE</span>`
      : `<span class="badge" style="background-color: #E0F2FE; color: #0369A1; font-weight: 600; border: 1px solid #BAE6FD;">HIRING</span>`;

    return `
      <div class="card job-card card-hover">
        <div class="job-card-header">
          <img src="${logoUrl}" alt="${job.company} logo" class="company-logo" onerror="this.src='${UI.getInitialsAvatar(job.company)}'">
          <div style="flex: 1;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <h3 class="job-title" style="margin-bottom: 0;">${job.title}</h3>
                ${postTypeBadge}
              </div>
              <button class="btn-save-job" data-job-id="${job.id}" style="color: ${isSaved ? 'var(--primary)' : 'var(--text-muted)'}; padding: 0.25rem; transition: var(--transition-fast);" aria-label="${isSaved ? 'Unsave Job' : 'Save Job'}" title="${isSaved ? 'Unsave Job' : 'Save Job'}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
            </div>
            <p class="company-name" style="margin-bottom: 0;">${job.company}</p>
          </div>
        </div>
        
        <div class="job-meta">
          <span class="badge ${typeClass}">${job.type}</span>
          <span class="badge badge-secondary" style="background: transparent; border: 1px solid var(--border);">${job.location}</span>
        </div>
        
        <div class="job-description text-secondary">
          ${job.description || ''}
        </div>
        
        <div class="job-card-footer">
          <div>
            <div style="font-weight: 600; color: var(--text-primary);">${formattedSalary}</div>
            <div style="font-size: 0.875rem; color: var(--text-muted);">${postedTimeAgo}</div>
          </div>
          <a href="/pages/job-details.html?id=${job.id}" class="btn btn-primary" style="padding: 0.5rem 1rem; border-radius: var(--radius-md);">View Details</a>
        </div>
      </div>
    `;
  },

  /**
   * Render skeleton loaders
   */
  renderSkeletons(count = 6) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="card job-card">
          <div class="job-card-header">
            <div class="skeleton skeleton-avatar"></div>
            <div style="flex: 1;">
              <div class="skeleton skeleton-text" style="width: 80%;"></div>
              <div class="skeleton skeleton-text short"></div>
            </div>
          </div>
          <div style="margin: 1rem 0;">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
          </div>
          <div class="job-card-footer">
            <div class="skeleton skeleton-text short"></div>
            <div class="skeleton skeleton-text" style="width: 100px;"></div>
          </div>
        </div>
      `;
    }
    return html;
  },
  
  /**
   * Render empty state
   */
  renderEmptyState() {
    return `
      <div class="card text-center" style="grid-column: 1 / -1; padding: 5rem 2rem; animation: fadeInUp 0.5s ease-out both;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--primary-light); display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h3 style="margin-bottom: 0.75rem;">No jobs found</h3>
        <p class="text-secondary" style="max-width: 400px; margin: 0 auto 2rem;">We couldn't find any jobs matching your criteria. Try adjusting your filters or search terms.</p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="window.location.href='/pages/jobs.html'">Browse All Jobs</button>
          <a href="/pages/login.html?signup=true" class="btn btn-outline">Post a Job</a>
        </div>
      </div>
    `;
  }
};

// Global Event Delegation for Save Job Buttons
document.addEventListener('click', async (e) => {
  const saveBtn = e.target.closest('.btn-save-job');
  if (!saveBtn) return;
  
  e.preventDefault();
  e.stopPropagation();

  // Disable button while processing
  saveBtn.disabled = true;
  saveBtn.style.opacity = '0.5';

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    UI.showToast('Please log in to save jobs', 'info');
    window.location.href = '/pages/login.html';
    return;
  }

  const jobId = saveBtn.dataset.jobId;
  const isSaved = saveBtn.style.color === 'var(--primary)';
  
  if (isSaved) {
    const res = await Jobs.unsaveJob(jobId, session.user.id);
    if (res.success) {
      saveBtn.style.color = 'var(--text-muted)';
      saveBtn.querySelector('svg').setAttribute('fill', 'none');
      saveBtn.setAttribute('title', 'Save Job');
      saveBtn.setAttribute('aria-label', 'Save Job');
      UI.showToast('Job removed from saved list');
    } else {
      UI.showToast('Failed to unsave job', 'error');
    }
  } else {
    const res = await Jobs.saveJob(jobId, session.user.id);
    if (res.success) {
      saveBtn.style.color = 'var(--primary)';
      saveBtn.querySelector('svg').setAttribute('fill', 'currentColor');
      saveBtn.setAttribute('title', 'Unsave Job');
      saveBtn.setAttribute('aria-label', 'Unsave Job');
      
      // Add a little pop animation
      saveBtn.style.transform = 'scale(1.2)';
      setTimeout(() => saveBtn.style.transform = 'scale(1)', 200);
      
      UI.showToast('Job saved successfully');
    } else {
      UI.showToast('Failed to save job', 'error');
    }
  }
  
  saveBtn.disabled = false;
  saveBtn.style.opacity = '1';
});
