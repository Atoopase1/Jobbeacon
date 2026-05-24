import { Freelance } from './freelance.js';
import { supabase, UI } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const gigsGrid = document.getElementById('gigsGrid');
  const resultsCount = document.getElementById('gigsResultsCount');
  const pagination = document.getElementById('gigsPagination');
  const searchInput = document.getElementById('gigSearchInput');
  const searchBtn = document.getElementById('gigSearchBtn');
  const sortSelect = document.getElementById('gigSortSelect');
  const filtersForm = document.getElementById('gigFiltersForm');
  const showFiltersBtn = document.getElementById('showGigFilters');
  const closeFiltersBtn = document.getElementById('closeGigFilters');
  const filtersSidebar = document.getElementById('gigFiltersSidebar');
  const quickCats = document.getElementById('quickCats');

  // Post Gig Modal
  const postGigModal = document.getElementById('postGigModal');
  const postGigForm = document.getElementById('postGigForm');
  const closePostModal = document.getElementById('closePostGigModal');
  const postGigBtns = [document.getElementById('postGigBtn'), document.getElementById('postGigBtnTop')];

  // Gig Detail Modal
  const gigDetailModal = document.getElementById('gigDetailModal');
  const gigDetailHeader = document.getElementById('gigDetailHeader');
  const gigDetailBody = document.getElementById('gigDetailBody');
  const closeDetailBtn = document.getElementById('closeGigDetail');

  // Skills Tag Input
  const skillsWrapper = document.getElementById('skillsInputWrapper');
  const skillTagInput = document.getElementById('skillTagInput');
  const skillsHidden = document.getElementById('skillsHidden');
  let skills = [];

  // State
  let currentPage = 1;
  const limit = 12;

  // Mobile filters
  if (showFiltersBtn) showFiltersBtn.addEventListener('click', () => { filtersSidebar.classList.add('active'); closeFiltersBtn.style.display = 'block'; });
  if (closeFiltersBtn) closeFiltersBtn.addEventListener('click', () => { filtersSidebar.classList.remove('active'); closeFiltersBtn.style.display = 'none'; });

  // Quick category buttons
  quickCats?.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-cat-btn');
    if (!btn) return;
    quickCats.querySelectorAll('.quick-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    const select = filtersForm?.querySelector(`select[name="category"]`);
    if (select) select.value = cat;
    loadGigs(1);
  });

  // Hero stats (simple counts)
  async function loadStats() {
    try {
      const { count: gigCount } = await supabase.from('freelance_gigs').select('*', { count: 'estimated', head: true }).eq('status', 'open');
      const { count: bidCount } = await supabase.from('freelance_bids').select('*', { count: 'estimated', head: true });
      document.getElementById('statGigs').textContent = (gigCount || 0) + '+';
      document.getElementById('statBids').textContent = (bidCount || 0) + '+';
      document.getElementById('statFreelancers').textContent = Math.floor((bidCount || 0) * 0.6) + '+';
    } catch { /* silent */ }
  }
  loadStats();

  // --- Load Gigs ---
  async function loadGigs(page = 1) {
    currentPage = page;
    gigsGrid.innerHTML = Freelance.renderSkeletons(6);
    resultsCount.textContent = 'Loading gigs...';

    const search = searchInput?.value || '';
    const formData = new FormData(filtersForm);
    const category = formData.get('category') || '';
    const budgetMin = formData.get('budgetMin') ? Number(formData.get('budgetMin')) : null;
    const budgetMax = formData.get('budgetMax') ? Number(formData.get('budgetMax')) : null;
    const sortBy = sortSelect?.value || 'newest';

    const { gigs, count, error } = await Freelance.getGigs({
      page, limit, search, category, budgetMin, budgetMax, sortBy, status: 'open'
    });

    if (error) {
      gigsGrid.innerHTML = `<div style="grid-column:1/-1;color:#EF4444;">Failed to load gigs: ${error}</div>`;
      resultsCount.textContent = 'Error';
      return;
    }

    if (!gigs || gigs.length === 0) {
      gigsGrid.innerHTML = Freelance.renderEmptyState();
      resultsCount.textContent = '0 gigs found';
      pagination.innerHTML = '';
      document.getElementById('emptyPostGigBtn')?.addEventListener('click', () => openPostGigModal());
      return;
    }

    resultsCount.textContent = `Showing ${gigs.length} of ${count} gig${count !== 1 ? 's' : ''}`;
    gigsGrid.innerHTML = gigs.map(g => Freelance.renderGigCard(g)).join('');
    renderPagination(count);
  }

  function renderPagination(totalCount) {
    const totalPages = Math.ceil(totalCount / limit);
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }
    let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>`;
    pagination.innerHTML = html;
    pagination.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => { loadGigs(parseInt(btn.dataset.page)); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    });
  }

  // Event listeners
  searchBtn?.addEventListener('click', () => loadGigs(1));
  searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadGigs(1); });
  sortSelect?.addEventListener('change', () => loadGigs(1));
  filtersForm?.addEventListener('change', () => { loadGigs(1); if (window.innerWidth <= 900) filtersSidebar.classList.remove('active'); });
  document.getElementById('clearGigFilters')?.addEventListener('click', (e) => { e.preventDefault(); filtersForm.reset(); searchInput.value = ''; quickCats.querySelectorAll('.quick-cat-btn').forEach(b => b.classList.remove('active')); quickCats.querySelector('[data-cat=""]')?.classList.add('active'); loadGigs(1); });

  // --- View Gig Detail ---
  gigsGrid.addEventListener('click', async (e) => {
    const viewBtn = e.target.closest('.btn-view-gig');
    if (!viewBtn) return;
    const gigId = viewBtn.dataset.gigId;
    openGigDetail(gigId);
  });

  async function openGigDetail(gigId) {
    gigDetailModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    gigDetailHeader.innerHTML = '<div class="skeleton skeleton-text" style="width:60%;height:1.5rem;"></div>';
    gigDetailBody.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">Loading gig details...</div>';

    const { gig, error } = await Freelance.getGigById(gigId);
    if (error || !gig) {
      gigDetailBody.innerHTML = '<p style="color:#EF4444;">Failed to load gig details.</p>';
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const isOwner = session && session.user.id === gig.user_id;
    const posterName = gig.profiles?.full_name || 'Anonymous';
    const posterAvatar = gig.profiles?.avatar_url || UI.getInitialsAvatar(posterName);
    const budgetDisplay = Freelance.formatBudgetRange(gig.budget_min, gig.budget_max);
    const skills = gig.skills || [];

    let deadlineStr = 'No deadline';
    if (gig.deadline) {
      const d = new Date(gig.deadline);
      deadlineStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    gigDetailHeader.innerHTML = `<h2 style="font-size:1.35rem;margin:0;">${gig.title}</h2>`;

    gigDetailBody.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem;">
        <img src="${posterAvatar}" alt="${posterName}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border);" onerror="this.src='${UI.getInitialsAvatar(posterName)}'">
        <div><strong>${posterName}</strong><br><span style="font-size:0.8rem;color:var(--text-muted);">Posted ${UI.timeAgo(gig.created_at)}</span></div>
      </div>
      <div class="gig-detail-meta">
        <div class="gig-detail-meta-item"><div class="meta-label">Budget</div><div class="meta-value" style="color:var(--primary);">${budgetDisplay}</div></div>
        <div class="gig-detail-meta-item"><div class="meta-label">Deadline</div><div class="meta-value">${deadlineStr}</div></div>
        <div class="gig-detail-meta-item"><div class="meta-label">Category</div><div class="meta-value" style="font-size:0.95rem;">${gig.category}</div></div>
      </div>
      <h3 style="font-size:1rem;margin-bottom:0.75rem;">Description</h3>
      <div class="gig-detail-description">${gig.description}</div>
      ${skills.length ? `<h3 style="font-size:1rem;margin-bottom:0.75rem;">Required Skills</h3><div class="gig-skills" style="margin-bottom:1.5rem;">${skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>` : ''}
      <div id="bidsSection"></div>
      ${!isOwner && session ? `
        <div class="bid-form-section" id="bidFormSection">
          <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Place Your Bid</h3>
          <form id="bidForm">
            <div class="bid-form-grid">
              <div class="form-group"><label class="form-label">Your Bid (GHS) *</label><input type="number" class="form-control" name="amount" required min="1" placeholder="1500"></div>
              <div class="form-group"><label class="form-label">Delivery (days)</label><input type="number" class="form-control" name="delivery_days" min="1" placeholder="7"></div>
            </div>
            <div class="form-group"><label class="form-label">Message *</label><textarea class="form-control" name="message" rows="3" placeholder="Explain why you're the best fit..." required></textarea></div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Submit Bid</button>
          </form>
        </div>
      ` : ''}
      ${!session ? '<div style="text-align:center;padding:1.5rem;background:var(--bg-surface-hover);border-radius:var(--radius-lg);margin-top:1.5rem;"><p style="margin-bottom:0.75rem;">Sign in to place a bid on this gig.</p><a href="/pages/login.html" class="btn btn-primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;">Sign In</a></div>' : ''}
    `;

    // Load bids
    loadBids(gigId, isOwner);

    // Bid form handler
    const bidForm = document.getElementById('bidForm');
    if (bidForm) {
      bidForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(bidForm);
        const submitBtn = bidForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const { bid, error } = await Freelance.placeBid({
          gig_id: gigId,
          user_id: session.user.id,
          amount: Number(fd.get('amount')),
          delivery_days: fd.get('delivery_days') ? Number(fd.get('delivery_days')) : null,
          message: fd.get('message')
        });

        if (error) {
          UI.showToast(error.includes('duplicate') ? 'You already placed a bid on this gig.' : 'Failed to place bid: ' + error, 'error');
        } else {
          UI.showToast('Bid placed successfully!', 'success');
          bidForm.reset();
          loadBids(gigId, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Bid';
      });
    }
  }

  async function loadBids(gigId, isOwner) {
    const bidsSection = document.getElementById('bidsSection');
    if (!bidsSection) return;
    const { bids, error } = await Freelance.getBidsForGig(gigId);
    if (error || !bids.length) {
      bidsSection.innerHTML = `<h3 style="font-size:1rem;margin-bottom:0.5rem;">Bids (${bids?.length || 0})</h3><p style="color:var(--text-muted);font-size:0.9rem;">No bids yet. Be the first!</p>`;
      return;
    }
    bidsSection.innerHTML = `<h3 style="font-size:1rem;margin-bottom:0.75rem;">Bids (${bids.length})</h3><div class="bids-list">${bids.map(b => Freelance.renderBidCard(b, isOwner)).join('')}</div>`;

    // Accept bid handler
    if (isOwner) {
      bidsSection.querySelectorAll('.btn-accept-bid').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true; btn.textContent = 'Accepting...';
          const { success, error } = await Freelance.acceptBid(btn.dataset.bidId, gigId);
          if (success) { UI.showToast('Bid accepted!', 'success'); loadBids(gigId, true); }
          else { UI.showToast('Failed: ' + error, 'error'); btn.disabled = false; btn.textContent = 'Accept Bid'; }
        });
      });
    }
  }

  closeDetailBtn?.addEventListener('click', () => { gigDetailModal.style.display = 'none'; document.body.style.overflow = ''; });
  gigDetailModal?.addEventListener('click', (e) => { if (e.target === gigDetailModal) { gigDetailModal.style.display = 'none'; document.body.style.overflow = ''; } });

  // --- Post Gig Modal ---
  function openPostGigModal() {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { UI.showToast('Please sign in to post a gig.', 'info'); window.location.href = '/pages/login.html'; return; }
      postGigModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  }
  postGigBtns.forEach(btn => btn?.addEventListener('click', openPostGigModal));
  closePostModal?.addEventListener('click', () => { postGigModal.style.display = 'none'; document.body.style.overflow = ''; });
  postGigModal?.addEventListener('click', (e) => { if (e.target === postGigModal) { postGigModal.style.display = 'none'; document.body.style.overflow = ''; } });

  // Skills tag input
  function addSkill(value) {
    const v = value.trim();
    if (!v || skills.includes(v)) return;
    skills.push(v);
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.innerHTML = `${v}<span class="remove-skill" data-skill="${v}">&times;</span>`;
    skillsWrapper.insertBefore(tag, skillTagInput);
    skillsHidden.value = JSON.stringify(skills);
    skillTagInput.value = '';
  }

  skillTagInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillTagInput.value); }
    if (e.key === 'Backspace' && !skillTagInput.value && skills.length) {
      const last = skills.pop();
      skillsWrapper.querySelector(`.skill-tag .remove-skill[data-skill="${last}"]`)?.closest('.skill-tag')?.remove();
      skillsHidden.value = JSON.stringify(skills);
    }
  });

  skillsWrapper?.addEventListener('click', (e) => {
    const rm = e.target.closest('.remove-skill');
    if (rm) { skills = skills.filter(s => s !== rm.dataset.skill); rm.closest('.skill-tag').remove(); skillsHidden.value = JSON.stringify(skills); }
    else { skillTagInput.focus(); }
  });

  // Submit gig form
  postGigForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { UI.showToast('Please sign in.', 'info'); return; }

    const submitBtn = document.getElementById('submitGigBtn');
    submitBtn.disabled = true; submitBtn.textContent = 'Posting...';

    const fd = new FormData(postGigForm);
    const gigData = {
      user_id: session.user.id,
      title: fd.get('title'),
      category: fd.get('category'),
      description: fd.get('description'),
      budget_min: fd.get('budget_min') ? Number(fd.get('budget_min')) : null,
      budget_max: fd.get('budget_max') ? Number(fd.get('budget_max')) : null,
      deadline: fd.get('deadline') || null,
      skills: skills.length ? skills : null,
      status: 'open'
    };

    const { gig, error } = await Freelance.createGig(gigData);
    if (error) {
      UI.showToast('Failed to post gig: ' + error, 'error');
    } else {
      UI.showToast('Gig posted successfully!', 'success');
      postGigModal.style.display = 'none';
      document.body.style.overflow = '';
      postGigForm.reset();
      skills = [];
      skillsWrapper.querySelectorAll('.skill-tag').forEach(t => t.remove());
      skillsHidden.value = '';
      loadGigs(1);
      loadStats();
    }
    submitBtn.disabled = false; submitBtn.textContent = 'Post Gig';
  });

  // Initial load
  loadGigs(1);
});
