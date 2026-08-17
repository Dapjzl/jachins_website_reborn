/**
 * JACHINS Blog Admin Panel — admin-blog.js
 * Modules: AdminAuth | BlogStore | ImageOptimizer | MultiUploader | PostEditor | AdminUI
 */

'use strict';

/* ============================================================
   CONSTANTS
   ============================================================ */
const STORE_KEY   = 'jachins_blog_posts';
const SESSION_KEY = 'jachins_adm_auth';
const CREDENTIALS = { username: 'admin', password: 'jachins2024' };
const MAX_IMG_W   = 1200;     // px
const IMG_QUALITY = 0.75;     // JPEG quality
const MAX_IMAGES  = 6;       // per post
const CATEGORIES  = [
  'Pipeline Infrastructure', 'Smart Energy Technology', 'Safety & Compliance',
  'Infrastructure Engineering', 'Asset Integrity', 'EPC Projects',
  'Procurement & Supply', 'HSE & Environment', 'People & Training',
  'Corporate News', 'Industry Insights'
];

/* ============================================================
   UTILITY HELPERS
   ============================================================ */
const uid   = () => 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const fmt   = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(2)+' MB';
const escHtml = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = (iso) => { const d = new Date(iso); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };

function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ============================================================
   AdminAuth — session-based password gate
   ============================================================ */
const AdminAuth = {
  isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === 'true'; },
  login(user, pass) {
    if (user === CREDENTIALS.username && pass === CREDENTIALS.password) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      return true;
    }
    return false;
  },
  logout() { sessionStorage.removeItem(SESSION_KEY); }
};

/* ============================================================
   BlogStore — CRUD on localStorage
   ============================================================ */
const BlogStore = {
  _data: null,

  _load() {
    if (this._data) return this._data;
    try { this._data = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch(e) { this._data = []; }
    return this._data;
  },

  _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this._data));
      return true;
    } catch(e) {
      if (e.name === 'QuotaExceededError') { toast('Storage full — remove some images first', 'error'); }
      return false;
    }
  },

  getAll()  { return [...this._load()].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)); },
  getById(id) { return this._load().find(p => p.id === id) || null; },

  create(data) {
    this._load();
    const post = { id: uid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
    this._data.push(post);
    return this._save() ? post : null;
  },

  update(id, data) {
    this._load();
    const idx = this._data.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this._data[idx] = { ...this._data[idx], ...data, id, updatedAt: new Date().toISOString() };
    return this._save() ? this._data[idx] : null;
  },

  delete(id) {
    this._load();
    const idx = this._data.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this._data.splice(idx, 1);
    return this._save();
  },

  exportJSON() {
    return JSON.stringify(this._load(), null, 2);
  },

  importJSON(jsonStr) {
    let arr;
    try { arr = JSON.parse(jsonStr); } catch(e) { return false; }
    if (!Array.isArray(arr)) return false;
    this._data = arr;
    return this._save();
  },

  stats() {
    const all = this._load();
    const published = all.filter(p => p.status === 'published').length;
    const totalImages = all.reduce((sum, p) => sum + (p.images || []).length, 0);
    return { total: all.length, published, drafts: all.length - published, images: totalImages };
  }
};

/* ============================================================
   ImageOptimizer — Canvas-based compress + resize
   ============================================================ */
const ImageOptimizer = {
  /**
   * Compress a File/Blob, returns Promise<{ dataUrl, originalSize, compressedSize, saved, savedPct }>
   */
  compress(file, maxW = MAX_IMG_W, quality = IMG_QUALITY) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }

          const canvas = document.createElement('canvas');
          canvas.width  = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          // Approximate compressed byte size from base64
          const b64 = dataUrl.split(',')[1];
          const compressedSize = Math.round((b64.length * 3) / 4);
          const originalSize   = file.size;
          const saved    = Math.max(0, originalSize - compressedSize);
          const savedPct = originalSize > 0 ? Math.round(saved / originalSize * 100) : 0;

          resolve({ dataUrl, originalSize, compressedSize, saved, savedPct, width, height, name: file.name });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Compress multiple files, calls onProgress(current, total) between each
   */
  async compressMany(files, onProgress) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      if (onProgress) onProgress(i + 1, files.length);
      try {
        const r = await this.compress(files[i]);
        results.push(r);
      } catch(e) {
        console.warn('Could not compress', files[i].name, e);
      }
    }
    return results;
  }
};

/* ============================================================
   TOAST SYSTEM
   ============================================================ */
const toastContainer = (() => {
  const el = document.createElement('div');
  el.className = 'adm-toast-container';
  document.body.appendChild(el);
  return el;
})();

function toast(msg, type = 'info', duration = 3500) {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
  const el = document.createElement('div');
  el.className = `adm-toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escHtml(msg)}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

/* ============================================================
   CONFIRM DIALOG
   ============================================================ */
let _confirmResolve = null;
const confirmDialog = {
  el: null,
  init(el) { this.el = el; },
  show(title, msg) {
    return new Promise(resolve => {
      _confirmResolve = resolve;
      this.el.querySelector('.adm-confirm-title').textContent = title;
      this.el.querySelector('.adm-confirm-msg').textContent   = msg;
      this.el.classList.add('show');
    });
  },
  hide() { this.el.classList.remove('show'); },
  resolve(val) { this.hide(); if (_confirmResolve) { _confirmResolve(val); _confirmResolve = null; } }
};

/* ============================================================
   MultiUploader — drag-and-drop + compress + preview
   ============================================================ */
class MultiUploader {
  constructor(containerId) {
    this.container   = document.getElementById(containerId);
    this.images      = [];   // [{ dataUrl, name, originalSize, compressedSize, saved, savedPct }]
    this.coverIndex  = 0;
    this.dragSrcIdx  = null;
    this._bindEvents();
  }

  _bindEvents() {
    const zone   = this.container.querySelector('.adm-drop-zone');
    const input  = this.container.querySelector('input[type=file]');
    const browse = this.container.querySelector('.adm-browse-btn');

    if (browse) browse.addEventListener('click', () => input.click());

    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
    zone.addEventListener('drop',      (e) => { e.preventDefault(); zone.classList.remove('drag-over'); this._handleFiles(e.dataTransfer.files); });
    zone.addEventListener('click',     ()  => input.click());
    input.addEventListener('change',   ()  => { this._handleFiles(input.files); input.value=''; });
  }

  async _handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    const remaining = MAX_IMAGES - this.images.length;
    if (remaining <= 0) { toast(`Max ${MAX_IMAGES} images per post`, 'warning'); return; }
    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) toast(`Only ${remaining} more image(s) allowed`, 'warning');

    const statsEl = this.container.querySelector('.adm-compress-row');
    if (statsEl) statsEl.innerHTML = `<span>Optimizing ${toProcess.length} image(s)…</span>`;

    const results = await ImageOptimizer.compressMany(toProcess, (cur, total) => {
      if (statsEl) statsEl.innerHTML = `<span>Optimizing image ${cur} of ${total}…</span>`;
    });

    const totalOrig = results.reduce((s,r) => s + r.originalSize, 0);
    const totalComp = results.reduce((s,r) => s + r.compressedSize, 0);
    const savedPct  = totalOrig > 0 ? Math.round((totalOrig - totalComp) / totalOrig * 100) : 0;

    this.images.push(...results);
    if (this.images.length > 0 && this.coverIndex >= this.images.length) this.coverIndex = 0;

    if (statsEl) statsEl.innerHTML =
      `<span>${results.length} image(s) added</span>` +
      `<span class="adm-img-stat-saved">&#9650; ${savedPct}% smaller (${fmt(totalOrig)} → ${fmt(totalComp)})</span>`;

    this._renderGrid();
  }

  _renderGrid() {
    const grid = this.container.querySelector('.adm-image-grid');
    grid.innerHTML = '';
    this.images.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'adm-img-item' + (idx === this.coverIndex ? ' cover' : '');
      item.draggable = true;
      item.dataset.idx = idx;
      item.innerHTML = `
        ${idx === this.coverIndex ? '<span class="adm-cover-tag">Cover</span>' : ''}
        <img class="adm-img-thumb" src="${img.dataUrl}" alt="${escHtml(img.name || '')}">
        <div class="adm-img-overlay">
          <div class="adm-img-actions-row">
            <button class="adm-img-action set-cover" title="Set as cover"><i class="fa-solid fa-star"></i></button>
            <button class="adm-img-action remove" title="Remove"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="adm-img-label">${fmt(img.compressedSize)}</div>
      `;
      // Events
      item.querySelector('.set-cover').addEventListener('click', (e) => { e.stopPropagation(); this.setCover(idx); });
      item.querySelector('.remove').addEventListener('click',    (e) => { e.stopPropagation(); this.removeImage(idx); });
      // Drag-to-reorder
      item.addEventListener('dragstart', () => { this.dragSrcIdx = idx; item.classList.add('dragging'); });
      item.addEventListener('dragend',   () => { this.dragSrcIdx = null; document.querySelectorAll('.adm-img-item').forEach(el => el.classList.remove('dragging','drag-target')); });
      item.addEventListener('dragover',  (e) => { e.preventDefault(); item.classList.add('drag-target'); });
      item.addEventListener('dragleave', () => item.classList.remove('drag-target'));
      item.addEventListener('drop',      (e) => { e.preventDefault(); if (this.dragSrcIdx !== null && this.dragSrcIdx !== idx) this.reorder(this.dragSrcIdx, idx); });
      grid.appendChild(item);
    });
  }

  setCover(idx) {
    this.coverIndex = idx;
    this._renderGrid();
    toast('Cover image set', 'success');
  }

  removeImage(idx) {
    this.images.splice(idx, 1);
    if (this.coverIndex >= this.images.length) this.coverIndex = Math.max(0, this.images.length - 1);
    this._renderGrid();
  }

  reorder(from, to) {
    const item = this.images.splice(from, 1)[0];
    this.images.splice(to, 0, item);
    if (this.coverIndex === from) this.coverIndex = to;
    else if (this.coverIndex > from && this.coverIndex <= to) this.coverIndex--;
    else if (this.coverIndex < from && this.coverIndex >= to) this.coverIndex++;
    this._renderGrid();
  }

  loadImages(images, coverIndex = 0) {
    this.images = images ? [...images] : [];
    this.coverIndex = coverIndex || 0;
    this._renderGrid();
    const statsEl = this.container.querySelector('.adm-compress-row');
    if (statsEl) statsEl.innerHTML = '';
  }

  getData() {
    return { images: this.images, coverIndex: this.coverIndex };
  }

  reset() {
    this.images = [];
    this.coverIndex = 0;
    this._renderGrid();
    const statsEl = this.container.querySelector('.adm-compress-row');
    if (statsEl) statsEl.innerHTML = '';
  }
}

/* ============================================================
   RICH TEXT EDITOR
   ============================================================ */
const RTE = {
  el: null,
  init(el) {
    this.el = el;
    document.querySelectorAll('.adm-rte-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        const arg = btn.dataset.arg || null;
        document.execCommand(cmd, false, arg);
        this.el.focus();
        this._updateToolbar();
      });
    });
    document.querySelector('.adm-rte-select[data-cmd="formatBlock"]')?.addEventListener('change', (e) => {
      document.execCommand('formatBlock', false, e.target.value);
      this.el.focus();
      this._updateToolbar();
      e.target.value = '';
    });
    this.el.addEventListener('keyup',   () => this._updateToolbar());
    this.el.addEventListener('mouseup', () => this._updateToolbar());
  },
  _updateToolbar() {
    document.querySelectorAll('.adm-rte-btn[data-cmd]').forEach(btn => {
      try { btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd)); } catch(e) {}
    });
  },
  getHTML()    { return this.el ? this.el.innerHTML : ''; },
  setHTML(html){ if (this.el) this.el.innerHTML = html || ''; }
};

/* ============================================================
   ADMIN UI — main controller
   ============================================================ */
const AdminUI = {
  currentView:  'dashboard',
  editingId:    null,
  uploader:     null,
  searchQuery:  '',
  filterStatus: 'all',

  init() {
    // Auth gate
    if (AdminAuth.isLoggedIn()) { this._showApp(); }

    // Login form
    document.getElementById('adm-login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const user = document.getElementById('adm-username').value.trim();
      const pass = document.getElementById('adm-password').value;
      if (AdminAuth.login(user, pass)) {
        this._showApp();
      } else {
        document.getElementById('adm-login-error').classList.add('show');
      }
    });
    document.getElementById('adm-username').addEventListener('input', () =>
      document.getElementById('adm-login-error').classList.remove('show'));

    // Sidebar nav
    document.querySelectorAll('.adm-nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => this._navigate(item.dataset.view));
    });

    // Logout
    document.getElementById('adm-logout-btn').addEventListener('click', () => {
      AdminAuth.logout();
      location.reload();
    });

    // Mobile menu
    document.getElementById('adm-menu-toggle').addEventListener('click', () => {
      document.querySelector('.adm-sidebar').classList.toggle('open');
      document.getElementById('adm-sidebar-overlay').classList.toggle('show');
    });
    document.getElementById('adm-sidebar-overlay').addEventListener('click', () => {
      document.querySelector('.adm-sidebar').classList.remove('open');
      document.getElementById('adm-sidebar-overlay').classList.remove('show');
    });

    // Top New Post button
    document.getElementById('adm-btn-new').addEventListener('click', () => this._openEditor(null));

    // Posts view actions
    document.getElementById('adm-post-search').addEventListener('input', debounce((e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this._renderPostsTable();
    }));
    document.getElementById('adm-post-filter').addEventListener('change', (e) => {
      this.filterStatus = e.target.value;
      this._renderPostsTable();
    });

    // Editor form
    document.getElementById('adm-editor-form').addEventListener('submit', (e) => { e.preventDefault(); this._savePost(); });
    document.getElementById('adm-title-input').addEventListener('input', () => {
      const slug = slugify(document.getElementById('adm-title-input').value);
      document.getElementById('adm-slug-input').value = slug;
    });
    document.getElementById('adm-btn-preview').addEventListener('click', () => this._previewPost());
    document.getElementById('adm-btn-cancel').addEventListener('click', () => this._navigate('posts'));

    // Status toggle
    document.querySelectorAll('.adm-status-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.adm-status-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });

    // Preview modal close
    document.getElementById('adm-preview-close').addEventListener('click', () =>
      document.getElementById('adm-preview-modal').classList.remove('show'));
    document.getElementById('adm-preview-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('show');
    });

    // Confirm dialog
    confirmDialog.init(document.getElementById('adm-confirm-overlay'));
    document.getElementById('adm-confirm-yes').addEventListener('click', () => confirmDialog.resolve(true));
    document.getElementById('adm-confirm-no').addEventListener('click',  () => confirmDialog.resolve(false));

    // Export / Import
    document.getElementById('adm-btn-export').addEventListener('click', () => this._exportJSON());
    this._bindImport();

    // Populate category dropdown
    const catSel = document.getElementById('adm-category-select');
    CATEGORIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = c;
      catSel.appendChild(opt);
    });

    // Init uploader
    this.uploader = new MultiUploader('adm-image-uploader');

    // Init rich text editor
    RTE.init(document.getElementById('adm-rte-content'));

    // Excerpt char count
    const excerptEl = document.getElementById('adm-excerpt-input');
    const charCount = document.getElementById('adm-excerpt-count');
    excerptEl.addEventListener('input', () => {
      const len = excerptEl.value.length;
      charCount.textContent = `${len}/200`;
      charCount.className = 'adm-char-count' + (len > 200 ? ' over' : len > 160 ? ' warn' : '');
    });
  },

  _showApp() {
    document.getElementById('adm-login-overlay').classList.add('hidden');
    document.getElementById('adm-app').classList.remove('hidden');
    this._navigate('dashboard');
  },

  _navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.adm-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.adm-nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`adm-view-${view}`)?.classList.add('active');
    document.querySelector(`.adm-nav-item[data-view="${view}"]`)?.classList.add('active');

    // Update topbar title
    const titles = { dashboard:'Dashboard', posts:'All Posts', editor:'Post Editor', io:'Import / Export' };
    document.getElementById('adm-page-title').textContent = titles[view] || '';

    // Show/hide topbar new button
    const showNew = ['dashboard','posts'].includes(view);
    document.getElementById('adm-btn-new').style.display = showNew ? '' : 'none';

    if (view === 'dashboard') this._renderDashboard();
    if (view === 'posts')     this._renderPostsTable();
    if (view === 'editor' && !this.editingId) this._openEditor(null);
  },

  /* --- Dashboard --- */
  _renderDashboard() {
    const s = BlogStore.stats();
    document.getElementById('adm-stat-total').textContent     = s.total;
    document.getElementById('adm-stat-published').textContent = s.published;
    document.getElementById('adm-stat-drafts').textContent    = s.drafts;
    document.getElementById('adm-stat-images').textContent    = s.images;
    this._renderPostsTable('adm-recent-tbody', 5);
    // Update nav badge
    const badge = document.querySelector('.adm-nav-badge');
    if (badge) badge.textContent = s.total;
  },

  /* --- Posts Table --- */
  _renderPostsTable(tbodyId = 'adm-posts-tbody', limit = null) {
    let posts = BlogStore.getAll();
    if (this.searchQuery) posts = posts.filter(p => (p.title||'').toLowerCase().includes(this.searchQuery));
    if (this.filterStatus !== 'all') posts = posts.filter(p => p.status === this.filterStatus);
    if (limit) posts = posts.slice(0, limit);

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!posts.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="adm-empty-state"><i class="fa-regular fa-newspaper"></i><p>No posts found. Create your first post!</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = posts.map(p => {
      const thumb = p.images && p.images.length
        ? `<img class="adm-post-thumb" src="${p.images[p.coverIndex||0]?.dataUrl||p.images[0].dataUrl}" alt="thumb">`
        : `<div class="adm-post-thumb-placeholder"><i class="fa-regular fa-image"></i></div>`;
      const status = p.status === 'published'
        ? `<span class="adm-badge published"><i class="fa-solid fa-circle-dot"></i> Published</span>`
        : `<span class="adm-badge draft"><i class="fa-regular fa-clock"></i> Draft</span>`;
      const toggleTitle = p.status === 'published' ? 'Set to draft' : 'Publish';
      const toggleIcon  = p.status === 'published' ? 'fa-eye-slash' : 'fa-eye';

      return `<tr>
        <td>
          <div class="adm-post-title-cell">
            ${thumb}
            <div>
              <div class="adm-post-title-text">${escHtml(p.title || 'Untitled')}</div>
              <div class="adm-post-title-meta">${escHtml(p.category||'')} &bull; ${p.images?.length||0} image(s)</div>
            </div>
          </div>
        </td>
        <td>${status}</td>
        <td>${fmtDate(p.updatedAt)}</td>
        <td>${escHtml(p.author||'—')}</td>
        <td>
          <div class="adm-actions">
            <button class="adm-action-btn edit"       title="Edit"          onclick="AdminUI._openEditor('${p.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="adm-action-btn preview-btn" title="Preview"      onclick="AdminUI._previewPostById('${p.id}')"><i class="fa-solid fa-eye"></i></button>
            <button class="adm-action-btn publish-btn" title="${escHtml(toggleTitle)}" onclick="AdminUI._toggleStatus('${p.id}')"><i class="fa-solid ${toggleIcon}"></i></button>
            <button class="adm-action-btn delete"     title="Delete"        onclick="AdminUI._deletePost('${p.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  /* --- Editor --- */
  _openEditor(id) {
    this.editingId = id;
    this._navigate('editor');

    const form = document.getElementById('adm-editor-form');
    form.reset();
    RTE.setHTML('');
    this.uploader.reset();

    if (id) {
      const post = BlogStore.getById(id);
      if (!post) { toast('Post not found', 'error'); return; }
      document.getElementById('adm-title-input').value   = post.title   || '';
      document.getElementById('adm-slug-input').value    = post.slug    || '';
      document.getElementById('adm-author-input').value  = post.author  || '';
      document.getElementById('adm-date-input').value    = post.date    || '';
      document.getElementById('adm-excerpt-input').value = post.excerpt || '';
      document.getElementById('adm-category-select').value = post.category || '';
      document.getElementById('adm-tags-input').value    = (post.tags || []).join(', ');
      RTE.setHTML(post.body || '');
      this.uploader.loadImages(post.images || [], post.coverIndex || 0);

      const status = post.status || 'draft';
      document.querySelectorAll('.adm-status-opt').forEach(o => {
        o.classList.remove('active');
        if (o.dataset.status === status) o.classList.add('active');
      });
      document.getElementById('adm-editor-heading').textContent = 'Edit Post';
    } else {
      // Defaults for new post
      document.getElementById('adm-date-input').value = new Date().toISOString().split('T')[0];
      document.querySelectorAll('.adm-status-opt').forEach(o => {
        o.classList.remove('active');
        if (o.dataset.status === 'draft') o.classList.add('active');
      });
      document.getElementById('adm-editor-heading').textContent = 'New Post';
    }

    // Trigger excerpt count update
    document.getElementById('adm-excerpt-input').dispatchEvent(new Event('input'));
  },

  _savePost() {
    const title   = document.getElementById('adm-title-input').value.trim();
    const excerpt = document.getElementById('adm-excerpt-input').value.trim();
    if (!title)   { toast('Title is required', 'error'); document.getElementById('adm-title-input').focus(); return; }
    if (!excerpt) { toast('Excerpt is required', 'error'); document.getElementById('adm-excerpt-input').focus(); return; }

    const activeStatus = document.querySelector('.adm-status-opt.active')?.dataset.status || 'draft';
    const { images, coverIndex } = this.uploader.getData();
    const tagsRaw = document.getElementById('adm-tags-input').value;
    const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const data = {
      title,
      slug:     document.getElementById('adm-slug-input').value.trim() || slugify(title),
      author:   document.getElementById('adm-author-input').value.trim() || 'JACHINS Editorial',
      date:     document.getElementById('adm-date-input').value,
      category: document.getElementById('adm-category-select').value,
      excerpt,
      body:     RTE.getHTML(),
      tags,
      images,
      coverIndex,
      status:   activeStatus
    };

    let result;
    if (this.editingId) {
      result = BlogStore.update(this.editingId, data);
      if (result) { toast('Post updated!', 'success'); this.editingId = null; this._navigate('posts'); }
      else toast('Failed to save post', 'error');
    } else {
      result = BlogStore.create(data);
      if (result) { toast('Post created!', 'success'); this.editingId = null; this._navigate('posts'); }
      else toast('Failed to create post', 'error');
    }
  },

  _toggleStatus(id) {
    const post = BlogStore.getById(id);
    if (!post) return;
    const next = post.status === 'published' ? 'draft' : 'published';
    BlogStore.update(id, { status: next });
    toast(next === 'published' ? 'Post published!' : 'Moved to draft', next === 'published' ? 'success' : 'warning');
    this._renderPostsTable();
    this._renderDashboard();
  },

  async _deletePost(id) {
    const post = BlogStore.getById(id);
    if (!post) return;
    const ok = await confirmDialog.show('Delete Post', `"${post.title}" will be permanently deleted.`);
    if (!ok) return;
    BlogStore.delete(id);
    toast('Post deleted', 'warning');
    this._renderPostsTable();
    this._renderDashboard();
  },

  /* --- Preview --- */
  _previewPost() {
    const title   = document.getElementById('adm-title-input').value || 'Untitled';
    const excerpt = document.getElementById('adm-excerpt-input').value;
    const cat     = document.getElementById('adm-category-select').value;
    const author  = document.getElementById('adm-author-input').value || 'JACHINS Editorial';
    const date    = document.getElementById('adm-date-input').value;
    const body    = RTE.getHTML();
    const { images, coverIndex } = this.uploader.getData();
    this._showPreview({ title, excerpt, category: cat, author, date, body, images, coverIndex, status: 'preview' });
  },

  _previewPostById(id) {
    const post = BlogStore.getById(id);
    if (!post) return;
    this._showPreview(post);
  },

  _showPreview(post) {
    const modal = document.getElementById('adm-preview-modal');
    const body  = document.getElementById('adm-preview-content');
    const coverImg = post.images && post.images.length
      ? `<img class="adm-preview-hero" src="${(post.images[post.coverIndex||0]||post.images[0]).dataUrl}" alt="${escHtml(post.title||'')}"/>`
      : `<div class="adm-preview-hero-placeholder"><i class="fa-regular fa-image"></i></div>`;

    const galleryImgs = (post.images||[])
      .filter((_,i) => i !== (post.coverIndex||0))
      .slice(0,5)
      .map(im => `<img src="${im.dataUrl}" alt="">`)
      .join('');

    body.innerHTML = `
      ${coverImg}
      <div class="adm-preview-meta">
        ${post.category ? `<span class="cat-tag">${escHtml(post.category)}</span>` : ''}
        ${post.date ? `<span><i class="fa-regular fa-calendar fa-sm"></i> ${fmtDate(post.date+'T00:00:00')}</span>` : ''}
        ${post.author ? `<span><i class="fa-regular fa-user fa-sm"></i> ${escHtml(post.author)}</span>` : ''}
      </div>
      <h2 class="adm-preview-title">${escHtml(post.title||'Untitled')}</h2>
      <p style="color:var(--adm-muted);font-style:italic;margin-bottom:16px;">${escHtml(post.excerpt||'')}</p>
      <div class="adm-preview-body">${post.body||'<p>No body content yet.</p>'}</div>
      ${galleryImgs ? `<div class="adm-preview-images">${galleryImgs}</div>` : ''}
    `;
    modal.classList.add('show');
  },

  /* --- Export / Import --- */
  _exportJSON() {
    const json = BlogStore.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `jachins-blog-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export downloaded!', 'success');
  },

  _bindImport() {
    const zone  = document.getElementById('adm-import-zone');
    const input = document.getElementById('adm-import-input');

    if (zone) {
      zone.addEventListener('click',    () => input?.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave',() => zone.classList.remove('drag-over'));
      zone.addEventListener('drop',     (e) => { e.preventDefault(); zone.classList.remove('drag-over'); this._processImport(e.dataTransfer.files[0]); });
    }
    input?.addEventListener('change', () => { this._processImport(input.files[0]); input.value=''; });
  },

  _processImport(file) {
    if (!file || !file.name.endsWith('.json')) { toast('Please select a valid JSON file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const ok = await confirmDialog.show('Import Posts', 'This will MERGE with existing posts. Continue?');
      if (!ok) return;
      // Merge: add only new IDs
      const incoming = JSON.parse(e.target.result);
      if (!Array.isArray(incoming)) { toast('Invalid format', 'error'); return; }
      let added = 0;
      incoming.forEach(p => { if (!BlogStore.getById(p.id)) { BlogStore.create(p); added++; } });
      toast(`Imported ${added} new post(s)`, 'success');
      this._renderDashboard();
    };
    reader.readAsText(file);
  }
};

/* ============================================================
   BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => AdminUI.init());
