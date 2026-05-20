import { supabase, UI } from './app.js';

export const Freelance = {
  /**
   * Fetch freelance gigs with optional filtering and pagination
   */
  async getGigs(options = {}) {
    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      budgetMin = null,
      budgetMax = null,
      status = 'open',
      userId = null,
      sortBy = 'newest'
    } = options;

    try {
      let query = supabase
        .from('freelance_gigs')
        .select('*, profiles(full_name, avatar_url), freelance_bids(count)', { count: 'estimated' });

      // Apply filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,skills.cs.{${search}}`);
      }
      if (category) query = query.eq('category', category);
      if (status) query = query.eq('status', status);
      if (userId) query = query.eq('user_id', userId);
      if (budgetMin) query = query.gte('budget_max', budgetMin);
      if (budgetMax) query = query.lte('budget_min', budgetMax);

      // Sorting
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'budget_high') {
        query = query.order('budget_max', { ascending: false });
      } else if (sortBy === 'budget_low') {
        query = query.order('budget_min', { ascending: true });
      } else if (sortBy === 'deadline') {
        query = query.order('deadline', { ascending: true });
      }

      // Pagination
      if (limit > 0) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return { gigs: data, count, error: null };
    } catch (error) {
      console.error('Error fetching gigs:', error.message);
      return { gigs: [], count: 0, error: error.message };
    }
  },

  /**
   * Get a single gig by ID with bids
   */
  async getGigById(id) {
    try {
      const { data, error } = await supabase
        .from('freelance_gigs')
        .select('*, profiles(full_name, avatar_url)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { gig: data, error: null };
    } catch (error) {
      console.error('Error fetching gig:', error.message);
      return { gig: null, error: error.message };
    }
  },

  /**
   * Create a new freelance gig
   */
  async createGig(gigData) {
    try {
      const { data, error } = await supabase
        .from('freelance_gigs')
        .insert([gigData])
        .select()
        .single();

      if (error) throw error;
      return { gig: data, error: null };
    } catch (error) {
      console.error('Error creating gig:', error.message);
      return { gig: null, error: error.message };
    }
  },

  /**
   * Update a freelance gig
   */
  async updateGig(id, updates) {
    try {
      const { data, error } = await supabase
        .from('freelance_gigs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { gig: data, error: null };
    } catch (error) {
      console.error('Error updating gig:', error.message);
      return { gig: null, error: error.message };
    }
  },

  /**
   * Delete a freelance gig
   */
  async deleteGig(id) {
    try {
      const { error } = await supabase
        .from('freelance_gigs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting gig:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Place a bid on a gig
   */
  async placeBid(bidData) {
    try {
      const { data, error } = await supabase
        .from('freelance_bids')
        .insert([bidData])
        .select('*, profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;
      return { bid: data, error: null };
    } catch (error) {
      console.error('Error placing bid:', error.message);
      return { bid: null, error: error.message };
    }
  },

  /**
   * Get bids for a specific gig
   */
  async getBidsForGig(gigId) {
    try {
      const { data, error } = await supabase
        .from('freelance_bids')
        .select('*, profiles(full_name, avatar_url)')
        .eq('gig_id', gigId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { bids: data, error: null };
    } catch (error) {
      console.error('Error fetching bids:', error.message);
      return { bids: [], error: error.message };
    }
  },

  /**
   * Get bids placed by a specific user
   */
  async getUserBids(userId) {
    try {
      const { data, error } = await supabase
        .from('freelance_bids')
        .select('*, freelance_gigs(title, status, category, budget_min, budget_max)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { bids: data, error: null };
    } catch (error) {
      console.error('Error fetching user bids:', error.message);
      return { bids: [], error: error.message };
    }
  },

  /**
   * Accept a bid (gig owner only)
   */
  async acceptBid(bidId, gigId) {
    try {
      // Update the bid status
      const { error: bidError } = await supabase
        .from('freelance_bids')
        .update({ status: 'accepted' })
        .eq('id', bidId);

      if (bidError) throw bidError;

      // Update gig status to in_progress
      const { error: gigError } = await supabase
        .from('freelance_gigs')
        .update({ status: 'in_progress' })
        .eq('id', gigId);

      if (gigError) throw gigError;

      // Reject all other bids
      const { error: rejectError } = await supabase
        .from('freelance_bids')
        .update({ status: 'rejected' })
        .eq('gig_id', gigId)
        .neq('id', bidId);

      if (rejectError) console.warn('Failed to reject other bids:', rejectError.message);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error accepting bid:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Format budget range display
   */
  formatBudgetRange(min, max) {
    if (!min && !max) return 'Negotiable';
    if (min && max && min === max) return UI.formatCurrency(min);
    if (min && max) return `${UI.formatCurrency(min)} – ${UI.formatCurrency(max)}`;
    if (min) return `From ${UI.formatCurrency(min)}`;
    return `Up to ${UI.formatCurrency(max)}`;
  },

  /**
   * Get category icon SVG
   */
  getCategoryIcon(category) {
    const icons = {
      'Web Development': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
      'Mobile Development': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
      'Graphic Design': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><path d="M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5z"></path><path d="M2 17l4-4a2 2 0 0 1 2.83 0L14 18"></path><path d="M14.5 15.5l1.5-1.5a2 2 0 0 1 2.83 0L22 17"></path></svg>',
      'Writing & Translation': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
      'Video & Animation': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
      'Digital Marketing': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
      'Data Entry': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
      'Virtual Assistant': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
      'Other': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
    };
    return icons[category] || icons['Other'];
  },

  /**
   * Render a freelance gig card
   */
  renderGigCard(gig) {
    const budgetDisplay = this.formatBudgetRange(gig.budget_min, gig.budget_max);
    const postedTimeAgo = UI.timeAgo(gig.created_at);
    const bidCount = gig.freelance_bids?.[0]?.count || 0;
    const posterName = gig.profiles?.full_name || 'Anonymous';
    const posterAvatar = gig.profiles?.avatar_url || UI.getInitialsAvatar(posterName);
    const skills = gig.skills || [];
    const categoryIcon = this.getCategoryIcon(gig.category);

    // Status badge style
    let statusBadge = '';
    if (gig.status === 'open') {
      statusBadge = '<span class="badge" style="background: linear-gradient(135deg, #D1FAE5, #A7F3D0); color: #065F46; font-weight: 600; border: 1px solid #6EE7B7;">Open</span>';
    } else if (gig.status === 'in_progress') {
      statusBadge = '<span class="badge" style="background: linear-gradient(135deg, #FEF3C7, #FDE68A); color: #92400E; font-weight: 600; border: 1px solid #FCD34D;">In Progress</span>';
    } else {
      statusBadge = '<span class="badge" style="background: linear-gradient(135deg, #E2E8F0, #CBD5E1); color: #475569; font-weight: 600; border: 1px solid #94A3B8;">Completed</span>';
    }

    // Deadline display
    let deadlineDisplay = '';
    if (gig.deadline) {
      const deadline = new Date(gig.deadline);
      const now = new Date();
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        deadlineDisplay = `<span style="font-size: 0.8rem; color: ${daysLeft <= 3 ? '#EF4444' : 'var(--text-muted)'};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left
        </span>`;
      } else {
        deadlineDisplay = '<span style="font-size: 0.8rem; color: #EF4444;">Deadline passed</span>';
      }
    }

    return `
      <div class="card gig-card card-hover" data-gig-id="${gig.id}">
        <div class="gig-card-top">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
            <img src="${posterAvatar}" alt="${posterName}" class="gig-poster-avatar" onerror="this.src='${UI.getInitialsAvatar(posterName)}'">
            <div style="flex: 1; min-width: 0;">
              <h3 class="gig-title">${gig.title}</h3>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">by ${posterName}</p>
            </div>
            ${statusBadge}
          </div>
          
          <div class="gig-category-badge">
            ${categoryIcon}
            <span>${gig.category}</span>
          </div>
          
          <p class="gig-description">${gig.description || ''}</p>
          
          <div class="gig-skills">
            ${skills.slice(0, 4).map(s => `<span class="skill-tag">${s}</span>`).join('')}
            ${skills.length > 4 ? `<span class="skill-tag skill-tag-more">+${skills.length - 4}</span>` : ''}
          </div>
        </div>
        
        <div class="gig-card-bottom">
          <div class="gig-meta-row">
            <div class="gig-budget">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              <span>${budgetDisplay}</span>
            </div>
            ${deadlineDisplay}
          </div>
          
          <div class="gig-card-footer">
            <div class="gig-stats">
              <span class="gig-bid-count" title="Bids placed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                ${bidCount} bid${bidCount !== 1 ? 's' : ''}
              </span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${postedTimeAgo}</span>
            </div>
            <button class="btn btn-primary btn-view-gig" data-gig-id="${gig.id}" style="padding: 0.5rem 1.25rem; border-radius: var(--radius-md); font-size: 0.875rem;">View & Bid</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render skeleton loaders for gig cards
   */
  renderSkeletons(count = 6) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="card gig-card">
          <div class="gig-card-top">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;"></div>
              <div style="flex: 1;">
                <div class="skeleton skeleton-text" style="width: 75%;"></div>
                <div class="skeleton skeleton-text short" style="width: 40%;"></div>
              </div>
            </div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <div class="skeleton" style="width: 60px; height: 24px; border-radius: 12px;"></div>
              <div class="skeleton" style="width: 80px; height: 24px; border-radius: 12px;"></div>
              <div class="skeleton" style="width: 50px; height: 24px; border-radius: 12px;"></div>
            </div>
          </div>
          <div class="gig-card-bottom">
            <div class="skeleton skeleton-text" style="width: 50%;"></div>
            <div style="display: flex; justify-content: space-between; margin-top: 0.75rem;">
              <div class="skeleton skeleton-text" style="width: 30%;"></div>
              <div class="skeleton" style="width: 90px; height: 34px; border-radius: var(--radius-md);"></div>
            </div>
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
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>
        <h3 style="margin-bottom: 0.75rem;">No gigs found</h3>
        <p class="text-secondary" style="max-width: 400px; margin: 0 auto 2rem;">No freelance gigs match your criteria. Try adjusting your filters or be the first to post one!</p>
        <button class="btn btn-primary" id="emptyPostGigBtn">Post a Gig</button>
      </div>
    `;
  },

  /**
   * Render a bid card
   */
  renderBidCard(bid, isGigOwner = false) {
    const bidderName = bid.profiles?.full_name || 'Anonymous';
    const bidderAvatar = bid.profiles?.avatar_url || UI.getInitialsAvatar(bidderName);
    const timeAgo = UI.timeAgo(bid.created_at);

    let statusClass = '';
    let statusLabel = bid.status;
    if (bid.status === 'pending') {
      statusClass = 'style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D;"';
      statusLabel = 'Pending';
    } else if (bid.status === 'accepted') {
      statusClass = 'style="background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7;"';
      statusLabel = 'Accepted';
    } else if (bid.status === 'rejected') {
      statusClass = 'style="background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5;"';
      statusLabel = 'Rejected';
    }

    return `
      <div class="bid-card" data-bid-id="${bid.id}">
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
          <img src="${bidderAvatar}" alt="${bidderName}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border);" onerror="this.src='${UI.getInitialsAvatar(bidderName)}'">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <strong style="color: var(--text-primary);">${bidderName}</strong>
                <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">${timeAgo}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="badge" ${statusClass}>${statusLabel}</span>
                <span style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">${UI.formatCurrency(bid.amount)}</span>
              </div>
            </div>
            <p style="margin: 0.75rem 0 0; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">${bid.message || 'No message provided.'}</p>
            ${bid.delivery_days ? `<span style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; display: inline-block;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Delivery in ${bid.delivery_days} day${bid.delivery_days !== 1 ? 's' : ''}
            </span>` : ''}
            ${isGigOwner && bid.status === 'pending' ? `
              <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                <button class="btn btn-primary btn-accept-bid" data-bid-id="${bid.id}" style="padding: 0.375rem 1rem; font-size: 0.8rem; border-radius: var(--radius-md);">Accept Bid</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
};
