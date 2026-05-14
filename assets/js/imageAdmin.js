/**
 * imageAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only Site Editor for JobBeacon.
 * When atoopase@gmail.com (or another admin) is signed in:
 *  • The admin can toggle "Admin Mode" using a discrete icon in the bottom right.
 *  • When active, hovering is disabled for normal visitors, but the admin can:
 *    - Double tap an image to edit its URL or upload a new one.
 *    - Double tap text to add/edit/repost its content.
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

let adminModeActive = false;

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
    /* Discrete Toggle Button */
    #admin-mode-toggle {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      opacity: 0.15;
      cursor: pointer;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s, background 0.3s, transform 0.2s;
      border-radius: 50%;
      color: var(--text-primary, #000);
    }
    #admin-mode-toggle:hover { opacity: 0.8; }
    #admin-mode-toggle.active {
      opacity: 1;
      background: var(--sq-teal, #0F766E);
      color: #fff;
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(15,118,110,0.4);
    }
    
    /* Crosshair hints ONLY when active */
    body.admin-active img:hover {
      outline: 2px dashed #2DD4BF;
      outline-offset: 2px;
      cursor: crosshair;
    }
    body.admin-active [data-text-id]:hover {
      outline: 1px dashed #F59E0B;
      cursor: crosshair;
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

/* ─── Admin Initialization ────────────────────────────────────────────────── */
async function init() {
  await applyOverrides();

  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const email = session.user.email?.toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return;

  injectAdminStyles();

  const toggle = document.createElement('button');
  toggle.id = 'admin-mode-toggle';
  toggle.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>';
  toggle.title = "Toggle Admin Edit Mode";
  document.body.appendChild(toggle);

  toggle.addEventListener('click', () => {
    adminModeActive = !adminModeActive;
    if (adminModeActive) {
      toggle.classList.add('active');
      document.body.classList.add('admin-active');
      showToast('Admin Mode ON - Double tap elements to edit');
    } else {
      toggle.classList.remove('active');
      document.body.classList.remove('admin-active');
      showToast('Admin Mode OFF');
    }
  });

  document.body.addEventListener('dblclick', (e) => {
    if (!adminModeActive) return;

    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      e.stopPropagation();
      openImageModal(e.target);
      return;
    }

    const textEl = e.target.closest('[data-text-id]');
    if (textEl && !textEl.closest('#img-admin-modal-overlay')) {
      e.preventDefault();
      e.stopPropagation();
      openTextModal(textEl);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
