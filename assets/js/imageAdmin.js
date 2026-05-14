/**
 * imageAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only Site Editor for JobBeacon.
 * When atoopase@gmail.com is signed in and has activated Admin Mode from Dashboard:
 *  • Explicit "Edit" buttons appear over images and text elements on hover.
 *  • Clicking Edit opens modals to change image URLs, upload files, or edit HTML.
 *  • Changes are saved to Supabase tables `site_images` and `site_text`.
 *  • On every page load, saved overrides are applied automatically for ALL visitors.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://seztjsmsmpufglzevnwn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlenRqc21zbXB1ZmdsemV2bnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjA0MDIsImV4cCI6MjA5NDA5NjQwMn0.D1VD33-xhOutdNq0-KRYogxtrMuSeNDRktf-x-UD9t8';
const ADMIN_EMAILS  = ['atoopase@gmail.com', 'www.atoopasechristopher@gmail.com'];
const BUCKET        = 'site-images';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

let adminModeActive = localStorage.getItem('jobbeacon_admin_mode') === 'true';

/* ─── Utility ─────────────────────────────────────────────────────────────── */
function pageKey() {
  return window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
}

function assignIds() {
  const textEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, li, button, .job-description, .skill-card-title, .skill-card-desc');
  textEls.forEach((el, i) => {
    if (!el.dataset.textId) {
      el.dataset.textId = `${pageKey()}::txt-${i}`;
    }
  });

  const imgs = document.querySelectorAll('img');
  imgs.forEach((img, j) => {
    if (!img.dataset.imgId) {
      img.dataset.imgId = `${pageKey()}::img-${j}`;
    }
  });
}

/* ─── Load & apply overrides (runs for ALL visitors) ─────────────────────── */
export async function applyOverrides() {
  assignIds();
  
  // Fetch Overrides
  const [imgRes, txtRes] = await Promise.all([
    sb.from('site_images').select('img_id, url').eq('page', pageKey()),
    sb.from('site_text').select('text_id, content').eq('page', pageKey())
  ]);

  const imgMap = {};
  if (imgRes.data) imgRes.data.forEach(r => { imgMap[r.img_id] = r.url; });

  const txtMap = {};
  if (txtRes.data) txtRes.data.forEach(r => { txtMap[r.text_id] = r.content; });

  function applyToDom() {
    document.querySelectorAll('img[data-img-id]').forEach(img => {
      if (imgMap[img.dataset.imgId]) img.src = imgMap[img.dataset.imgId];
    });
    document.querySelectorAll('[data-text-id]').forEach(el => {
      if (txtMap[el.dataset.textId] && el.innerHTML !== txtMap[el.dataset.textId]) {
        el.innerHTML = txtMap[el.dataset.textId];
      }
    });
  }

  applyToDom();

  const observer = new MutationObserver(() => {
    assignIds();
    applyToDom();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/* ─── Admin UI Styles ─────────────────────────────────────────────────────── */
function injectAdminStyles() {
  if (document.getElementById('site-admin-styles')) return;
  const s = document.createElement('style');
  s.id = 'site-admin-styles';
  s.textContent = `
    /* Floating Global Edit Button */
    .global-admin-edit-btn {
      position: fixed;
      z-index: 999998;
      background: #F59E0B;
      color: #080E17;
      border: 2px solid #080E17;
      padding: 6px 12px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: auto;
      transition: background 0.2s, transform 0.1s;
    }
    .global-admin-edit-btn:hover {
      background: #D97706;
      transform: scale(1.05);
    }
    .global-admin-edit-btn i { margin-right: 4px; }

    /* Crosshair hints ONLY when active */
    body.admin-active img:hover {
      outline: 3px dashed #2DD4BF;
      outline-offset: 2px;
    }
    body.admin-active [data-text-id]:hover {
      outline: 2px dashed #F59E0B;
      outline-offset: 2px;
      background: rgba(245, 158, 11, 0.05);
    }

    /* Modal Styles */
    #img-admin-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
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
    #img-admin-modal h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 6px; color: #2DD4BF; }
    #img-admin-modal p.admin-sub { font-size: 0.8rem; color: #7A92A8; margin-bottom: 20px; }
    
    .img-admin-preview { width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 18px; border: 1px solid #1A3045; background: #111F2E; }
    .img-admin-label { font-size: 0.75rem; font-weight: 600; color: #7A92A8; text-transform: uppercase; margin-bottom: 6px; display: block; }
    .img-admin-input { width: 100%; background: #111F2E; border: 1px solid #1A3045; border-radius: 10px; color: #F1F5F9; font-family: inherit; font-size: 0.88rem; padding: 11px 14px; margin-bottom: 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
    .img-admin-input:focus { border-color: #2DD4BF; }
    .img-admin-textarea { height: 180px; resize: vertical; line-height: 1.5; font-family: monospace; font-size: 0.85rem; }
    .img-admin-or { text-align: center; color: #445A6F; font-size: 0.78rem; margin: 4px 0 14px; }
    .img-admin-upload-btn { width: 100%; border: 1px dashed #1A3045; border-radius: 10px; background: #111F2E; color: #7A92A8; font-family: inherit; font-size: 0.85rem; padding: 12px; cursor: pointer; margin-bottom: 18px; }
    .img-admin-upload-btn:hover { border-color: #2DD4BF; color: #2DD4BF; }
    #img-admin-file { display: none; }
    .img-admin-actions { display: flex; gap: 10px; }
    .img-admin-save { flex: 1; background: #2DD4BF; color: #080E17; border: none; border-radius: 10px; padding: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: inherit; transition: opacity 0.2s; }
    .img-admin-save:hover { opacity: 0.88; }
    .img-admin-cancel { background: #111F2E; color: #7A92A8; border: 1px solid #1A3045; border-radius: 10px; padding: 12px 18px; font-family: inherit; cursor: pointer; font-size: 0.88rem; }
    
    .img-admin-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #2DD4BF; color: #080E17; font-weight: 700; padding: 12px 24px; border-radius: 30px; font-size: 0.88rem; z-index: 999999; box-shadow: 0 8px 24px rgba(45,212,191,0.4); animation: imgAdminSlideUp 0.3s ease both; }
    @keyframes imgAdminSlideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
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

/* ─── Modals ──────────────────────────────────────────────────────────────── */
let activeElement = null;
let activeType = null;

function closeModal() {
  const existing = document.getElementById('img-admin-modal-overlay');
  if (existing) existing.remove();
}

function openImageModal(img) {
  activeElement = img;
  activeType = 'image';
  closeModal();

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

  document.getElementById('img-admin-url').addEventListener('input', (e) => {
    if (e.target.value) document.getElementById('img-admin-preview').src = e.target.value;
  });

  document.getElementById('img-admin-trigger').addEventListener('click', () => {
    document.getElementById('img-admin-file').click();
  });
  document.getElementById('img-admin-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('img-admin-preview').src = URL.createObjectURL(file);
    showToast('Uploading…');
    await handleFileUpload(file);
  });

  document.getElementById('img-admin-save').addEventListener('click', saveImage);
  document.getElementById('img-admin-cancel').addEventListener('click', closeModal);
}

function openTextModal(el) {
  activeElement = el;
  activeType = 'text';
  closeModal();

  const overlay = document.createElement('div');
  overlay.id = 'img-admin-modal-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  overlay.innerHTML = `
    <div id="img-admin-modal">
      <h3 style="color:#F59E0B;">✏️ Add / Edit / Repost Text</h3>
      <p class="admin-sub">ID: <code style="color:#F59E0B;font-size:0.75rem;">${el.dataset.textId}</code></p>
      <label class="img-admin-label">Content (HTML allowed)</label>
      <textarea class="img-admin-input img-admin-textarea" id="txt-admin-content">${el.innerHTML}</textarea>
      <div class="img-admin-actions">
        <button class="img-admin-save" id="txt-admin-save" style="background:#F59E0B;">Save Changes</button>
        <button class="img-admin-cancel" id="img-admin-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('txt-admin-save').addEventListener('click', saveText);
  document.getElementById('img-admin-cancel').addEventListener('click', closeModal);
}

async function handleFileUpload(file) {
  const ext  = file.name.split('.').pop();
  const path = `${pageKey().replace(/\//g, '_') || 'root'}_${activeElement.dataset.imgId.replace(/[^a-z0-9]/gi,'_')}_${Date.now()}.${ext}`;

  const { data, error } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) { showToast('Upload failed: ' + error.message, true); return; }

  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
  document.getElementById('img-admin-url').value = publicUrl;
  document.getElementById('img-admin-preview').src = publicUrl;
  showToast('File uploaded! Click Save to apply.');
}

async function saveImage() {
  const url = document.getElementById('img-admin-url').value.trim();
  if (!url) { showToast('Please enter a URL', true); return; }

  const { error } = await sb.from('site_images').upsert({
    img_id: activeElement.dataset.imgId,
    page:   pageKey(),
    url,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'img_id' });

  if (error) { showToast('Save failed: ' + error.message, true); return; }

  activeElement.src = url;
  showToast('✓ Image updated!');
  closeModal();
}

async function saveText() {
  const content = document.getElementById('txt-admin-content').value;

  const { error } = await sb.from('site_text').upsert({
    text_id: activeElement.dataset.textId,
    page:    pageKey(),
    content,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'text_id' });

  if (error) { showToast('Save failed: ' + error.message, true); return; }

  activeElement.innerHTML = content;
  showToast('✓ Content updated!');
  closeModal();
}

/* ─── Hover Edit Logic ────────────────────────────────────────────────────── */
function setupHoverEditButtons() {
  const editBtn = document.createElement('button');
  editBtn.className = 'global-admin-edit-btn';
  editBtn.innerHTML = '✏️ Edit Content';
  document.body.appendChild(editBtn);

  let currentTarget = null;
  let hideTimeout = null;

  document.body.addEventListener('mousemove', (e) => {
    // Ignore if modal is open
    if (document.getElementById('img-admin-modal-overlay')) {
      editBtn.style.display = 'none';
      return;
    }

    if (e.target === editBtn) return; // hovering the button itself

    // Find closest editable element
    const target = e.target.closest('img, [data-text-id]');
    
    // Ignore layout containers that might accidentally have IDs
    if (target && (target.tagName === 'DIV' || target.tagName === 'BODY' || target.tagName === 'HTML')) {
        const isCard = target.classList.contains('skill-card') || target.classList.contains('category-card') || target.classList.contains('job-card');
        if (!isCard && !target.dataset.textId) {
             // Let it fall through
        }
    }

    if (target) {
      clearTimeout(hideTimeout);
      currentTarget = target;
      
      const rect = target.getBoundingClientRect();
      
      editBtn.style.display = 'flex';
      
      // Calculate position (top right corner of the element)
      let top = rect.top + 5;
      let left = rect.right - editBtn.offsetWidth - 5;
      
      // Ensure button stays on screen
      if (top < 0) top = 5;
      if (left < 0) left = 5;
      if (left > window.innerWidth - editBtn.offsetWidth) left = window.innerWidth - editBtn.offsetWidth - 5;
      
      editBtn.style.top = top + 'px';
      editBtn.style.left = left + 'px';
      
      // Change text based on type
      if (target.tagName === 'IMG') {
        editBtn.innerHTML = '🖼️ Edit Image';
      } else {
        editBtn.innerHTML = '✏️ Edit Text';
      }
    } else {
      // Small delay before hiding to prevent flickering when moving to button
      hideTimeout = setTimeout(() => {
        editBtn.style.display = 'none';
        currentTarget = null;
      }, 100);
    }
  });

  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentTarget) return;
    
    if (currentTarget.tagName === 'IMG') {
      openImageModal(currentTarget);
    } else {
      openTextModal(currentTarget);
    }
    editBtn.style.display = 'none';
  });
  
  // Also keep click fallback
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('#img-admin-modal-overlay') || e.target === editBtn) return;
    const target = e.target.closest('img, [data-text-id]');
    if (target && e.altKey) {
        // Alt+Click as a fallback to open editor
        e.preventDefault();
        e.stopPropagation();
        if (target.tagName === 'IMG') openImageModal(target);
        else openTextModal(target);
    }
  });
}

/* ─── Admin Initialization ────────────────────────────────────────────────── */
async function init() {
  await applyOverrides();

  // If local storage says we're not in admin mode, do nothing further.
  if (!adminModeActive) return;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const email = session.user.email?.toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return;

  // Setup Admin UI
  injectAdminStyles();
  document.body.classList.add('admin-active');
  setupHoverEditButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
