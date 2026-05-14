/**
 * imageAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only image editor for JobBeacon.
 * When atoopase@gmail.com (or another admin) is signed in:
 *  • All <img> tags on the page get an "Edit Image" overlay button on hover
 *  • Clicking opens a modal to paste a URL OR upload from device
 *  • Changes are saved to Supabase table `site_images` keyed by image ID
 *  • On every page load, saved overrides are applied automatically for ALL visitors
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://seztjsmsmpufglzevnwn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlenRqc21zbXB1ZmdsemV2bnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjA0MDIsImV4cCI6MjA5NDA5NjQwMn0.D1VD33-xhOutdNq0-KRYogxtrMuSeNDRktf-x-UD9t8';
const ADMIN_EMAILS  = ['atoopase@gmail.com', 'www.atoopasechristopher@gmail.com'];
const BUCKET        = 'site-images';   // Supabase Storage bucket name

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ─── Utility ─────────────────────────────────────────────────────────────── */
function pageKey() {
  // Stable key for the current page path (strip trailing slashes / .html)
  return window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
}

function imgId(img, index) {
  // Stable per-image ID: page + dataset.imgId OR sequential index
  return img.dataset.imgId || `${pageKey()}::img-${index}`;
}

/* ─── Load & apply overrides (runs for ALL visitors) ─────────────────────── */
export async function applyImageOverrides() {
  const { data, error } = await sb
    .from('site_images')
    .select('img_id, url')
    .eq('page', pageKey());

  if (error || !data || data.length === 0) return;

  const map = {};
  data.forEach(r => { map[r.img_id] = r.url; });

  document.querySelectorAll('img[data-img-id]').forEach(img => {
    if (map[img.dataset.imgId]) {
      img.src = map[img.dataset.imgId];
    }
  });

  // Also handle dynamically added images (after JS renders cards)
  const observer = new MutationObserver(() => {
    document.querySelectorAll('img[data-img-id]').forEach(img => {
      if (map[img.dataset.imgId]) img.src = map[img.dataset.imgId];
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/* ─── Admin UI ────────────────────────────────────────────────────────────── */
function injectAdminStyles() {
  if (document.getElementById('img-admin-styles')) return;
  const s = document.createElement('style');
  s.id = 'img-admin-styles';
  s.textContent = `
    /* image wrapper overlay */
    .img-admin-wrap {
      position: relative;
      display: inline-block;
    }
    .img-admin-wrap img { display: block; }
    .img-edit-btn {
      position: absolute;
      top: 6px; right: 6px;
      z-index: 9999;
      background: rgba(15,118,110,0.92);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.5px;
      backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }
    .img-admin-wrap:hover .img-edit-btn {
      opacity: 1;
      pointer-events: auto;
    }
    /* Admin modal */
    #img-admin-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(8,14,23,0.82);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #img-admin-modal {
      background: #0D1620;
      border: 1px solid #1A3045;
      border-radius: 20px;
      padding: 28px 28px 24px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.7);
      color: #F1F5F9;
      font-family: 'DM Sans', 'Inter', sans-serif;
    }
    #img-admin-modal h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 6px;
      color: #2DD4BF;
    }
    #img-admin-modal p.admin-sub {
      font-size: 0.8rem;
      color: #7A92A8;
      margin-bottom: 20px;
    }
    .img-admin-preview {
      width: 100%;
      height: 160px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 18px;
      border: 1px solid #1A3045;
      background: #111F2E;
    }
    .img-admin-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #7A92A8;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
      display: block;
    }
    .img-admin-input {
      width: 100%;
      background: #111F2E;
      border: 1px solid #1A3045;
      border-radius: 10px;
      color: #F1F5F9;
      font-family: inherit;
      font-size: 0.88rem;
      padding: 11px 14px;
      margin-bottom: 14px;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .img-admin-input:focus { border-color: #2DD4BF; }
    .img-admin-or {
      text-align: center;
      color: #445A6F;
      font-size: 0.78rem;
      margin: 4px 0 14px;
    }
    .img-admin-upload-btn {
      width: 100%;
      border: 1px dashed #1A3045;
      border-radius: 10px;
      background: #111F2E;
      color: #7A92A8;
      font-family: inherit;
      font-size: 0.85rem;
      padding: 12px;
      cursor: pointer;
      margin-bottom: 18px;
      transition: border-color 0.2s, color 0.2s;
    }
    .img-admin-upload-btn:hover { border-color: #2DD4BF; color: #2DD4BF; }
    #img-admin-file { display: none; }
    .img-admin-actions {
      display: flex;
      gap: 10px;
    }
    .img-admin-save {
      flex: 1;
      background: #2DD4BF;
      color: #080E17;
      border: none;
      border-radius: 10px;
      padding: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.2s;
    }
    .img-admin-save:hover { opacity: 0.88; }
    .img-admin-cancel {
      background: #111F2E;
      color: #7A92A8;
      border: 1px solid #1A3045;
      border-radius: 10px;
      padding: 12px 18px;
      font-family: inherit;
      cursor: pointer;
      font-size: 0.88rem;
    }
    .img-admin-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #2DD4BF;
      color: #080E17;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 30px;
      font-size: 0.88rem;
      z-index: 999999;
      box-shadow: 0 8px 24px rgba(45,212,191,0.4);
      animation: imgAdminSlideUp 0.3s ease both;
    }
    @keyframes imgAdminSlideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(12px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    /* Admin mode indicator bar */
    #img-admin-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 9998;
      background: linear-gradient(90deg, #0F766E, #065F46);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 5px 16px;
      text-align: center;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    #img-admin-bar span { opacity: 0.75; }
  `;
  document.head.appendChild(s);
}

function showToast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = 'img-admin-toast';
  t.style.background = isError ? '#EF4444' : '#2DD4BF';
  t.style.color = isError ? '#fff' : '#080E17';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ─── Wrap every img in the page with admin overlay ─────────────────────── */
function wrapImages() {
  const allImgs = document.querySelectorAll('img');
  allImgs.forEach((img, index) => {
    // Assign stable data-img-id if not already set
    if (!img.dataset.imgId) {
      img.dataset.imgId = `${pageKey()}::img-${index}`;
    }
    // Skip if already wrapped
    if (img.parentElement?.classList.contains('img-admin-wrap')) return;
    // Skip tiny icons / SVG-as-img
    if ((img.width > 0 && img.width < 20) || img.closest('nav') || img.closest('footer')) return;

    const wrap = document.createElement('span');
    wrap.className = 'img-admin-wrap';
    wrap.style.cssText = img.style.cssText;
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'img-edit-btn';
    btn.innerHTML = `✏️ Edit Image`;
    btn.title = `Edit this image (ID: ${img.dataset.imgId})`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(img);
    });
    wrap.appendChild(btn);
  });
}

/* ─── Modal ───────────────────────────────────────────────────────────────── */
let activeImg = null;

function openModal(img) {
  activeImg = img;
  closeModal(); // close any existing

  const overlay = document.createElement('div');
  overlay.id = 'img-admin-modal-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  overlay.innerHTML = `
    <div id="img-admin-modal">
      <h3>✏️ Edit Image</h3>
      <p class="admin-sub">ID: <code style="color:#2DD4BF;font-size:0.75rem;">${img.dataset.imgId}</code></p>
      <img class="img-admin-preview" id="img-admin-preview" src="${img.src}" alt="preview" />
      <label class="img-admin-label">Paste image URL</label>
      <input class="img-admin-input" id="img-admin-url" type="url" placeholder="https://..." value="${img.src}" />
      <div class="img-admin-or">— or upload from device —</div>
      <button class="img-admin-upload-btn" id="img-admin-trigger">📂 Choose File to Upload</button>
      <input type="file" id="img-admin-file" accept="image/*" />
      <div class="img-admin-actions">
        <button class="img-admin-save" id="img-admin-save">Save Image</button>
        <button class="img-admin-cancel" id="img-admin-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Live preview on URL input
  const urlInput = document.getElementById('img-admin-url');
  const preview  = document.getElementById('img-admin-preview');
  urlInput.addEventListener('input', () => {
    if (urlInput.value) preview.src = urlInput.value;
  });

  // File upload trigger
  document.getElementById('img-admin-trigger').addEventListener('click', () => {
    document.getElementById('img-admin-file').click();
  });
  document.getElementById('img-admin-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    showToast('Uploading…');
    await handleFileUpload(file);
  });

  // Save button
  document.getElementById('img-admin-save').addEventListener('click', saveUrl);
  document.getElementById('img-admin-cancel').addEventListener('click', closeModal);
}

function closeModal() {
  const existing = document.getElementById('img-admin-modal-overlay');
  if (existing) existing.remove();
}

async function handleFileUpload(file) {
  const ext  = file.name.split('.').pop();
  const path = `${pageKey().replace(/\//g, '_') || 'root'}_${activeImg.dataset.imgId.replace(/[^a-z0-9]/gi,'_')}_${Date.now()}.${ext}`;

  const { data, error } = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    showToast('Upload failed: ' + error.message, true);
    return;
  }

  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
  document.getElementById('img-admin-url').value = publicUrl;
  document.getElementById('img-admin-preview').src = publicUrl;
  showToast('File uploaded! Click Save to apply.');
}

async function saveUrl() {
  const url = document.getElementById('img-admin-url').value.trim();
  if (!url) { showToast('Please enter a URL', true); return; }

  const { error } = await sb.from('site_images').upsert({
    img_id: activeImg.dataset.imgId,
    page:   pageKey(),
    url,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'img_id' });

  if (error) {
    showToast('Save failed: ' + error.message, true);
    return;
  }

  activeImg.src = url;
  showToast('✓ Image updated!');
  closeModal();
}

/* ─── Main init ───────────────────────────────────────────────────────────── */
async function init() {
  // 1. Always apply saved overrides for all visitors
  await applyImageOverrides();

  // 2. Check if current user is admin
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const email = session.user.email?.toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return;

  // 3. Admin mode — inject styles, bar, edit overlays
  injectAdminStyles();

  // Admin top bar
  const bar = document.createElement('div');
  bar.id = 'img-admin-bar';
  bar.innerHTML = `
    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    Image Editor Mode Active
    <span>— hover any image and click ✏️ Edit Image to change it</span>
  `;
  document.body.prepend(bar);
  document.body.style.paddingTop = (parseFloat(getComputedStyle(document.body).paddingTop || 0) + 30) + 'px';

  // Wrap existing images
  wrapImages();

  // Also wrap images that are added later by JS (e.g. SkillQuest category cards)
  const mo = new MutationObserver(() => wrapImages());
  mo.observe(document.body, { childList: true, subtree: true });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
