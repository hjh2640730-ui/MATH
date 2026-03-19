const ADMIN_PASSWORD = 'math1234';

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
const storage = firebase.storage();

// ===== STATE =====
let adminStudent = 'kimsiying';
let progressData = {};

// ===== TOAST =====
function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('upload-date').value = todayStr();
  document.getElementById('view-date').value = todayStr();
  setupDragDrop();
  setupFilePreview();
});

function todayStr() { return new Date().toISOString().split('T')[0]; }

// ===== LOGIN =====
document.getElementById('login-btn').addEventListener('click', tryLogin);
document.getElementById('pw-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') tryLogin();
});

function tryLogin() {
  const pw = document.getElementById('pw-input').value;
  if (pw === ADMIN_PASSWORD) {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    loadAdminProgress();
    loadStats();
  } else {
    document.getElementById('login-error').classList.remove('hidden');
    document.getElementById('pw-input').value = '';
    document.getElementById('pw-input').focus();
  }
}

// ===== STUDENT SELECTION =====
document.querySelectorAll('[data-student]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-student]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    adminStudent = btn.dataset.student;
    loadAdminProgress();
    loadStats();
  });
});

// ===== TABS =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab.dataset.tab)
    );
    document.getElementById('tab-admin-progress').classList.toggle('hidden', tab.dataset.tab !== 'admin-progress');
    document.getElementById('tab-admin-photos').classList.toggle('hidden', tab.dataset.tab !== 'admin-photos');
  });
});

// ===== STATS =====
async function loadStats() {
  document.getElementById('stat-pct').textContent = '...';
  document.getElementById('stat-done').textContent = '...';
  document.getElementById('stat-photos').textContent = '...';

  const student = STUDENTS[adminStudent];
  let totalDone = 0, totalAll = 0;

  for (const bookId of student.books) {
    try {
      const snap = await db.collection('progress').doc(`${adminStudent}_${bookId}`).get();
      const completed = snap.exists ? (snap.data().completed || []) : [];
      const book = BOOKS[bookId];
      totalDone += completed.length;
      totalAll += book.chapters.reduce((s, ch) => s + ch.sections.length, 0);
    } catch {}
  }

  const pct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;
  document.getElementById('stat-pct').textContent = pct + '%';
  document.getElementById('stat-done').textContent = `${totalDone}/${totalAll}`;

  try {
    const snap = await db.collection('photos').where('studentId', '==', adminStudent).get();
    document.getElementById('stat-photos').textContent = snap.size + '일';
  } catch {
    document.getElementById('stat-photos').textContent = '—';
  }
}

function updateStatProgress() {
  const student = STUDENTS[adminStudent];
  let totalDone = 0, totalAll = 0;
  student.books.forEach(bookId => {
    const book = BOOKS[bookId];
    totalDone += (progressData[bookId] || []).length;
    totalAll += book.chapters.reduce((s, ch) => s + ch.sections.length, 0);
  });
  const pct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;
  document.getElementById('stat-pct').textContent = pct + '%';
  document.getElementById('stat-done').textContent = `${totalDone}/${totalAll}`;
}

// ===== ADMIN PROGRESS =====
async function loadAdminProgress() {
  progressData = {};
  const student = STUDENTS[adminStudent];
  const list = document.getElementById('admin-progress-list');
  list.innerHTML = '<div class="loading">불러오는 중...</div>';

  for (const bookId of student.books) {
    try {
      const snap = await db.collection('progress').doc(`${adminStudent}_${bookId}`).get();
      progressData[bookId] = snap.exists ? (snap.data().completed || []) : [];
    } catch {
      progressData[bookId] = [];
    }
  }

  renderAdminProgress();
}

function renderAdminProgress() {
  const student = STUDENTS[adminStudent];
  const list = document.getElementById('admin-progress-list');
  list.innerHTML = '';

  student.books.forEach(bookId => {
    const book = BOOKS[bookId];
    const completed = progressData[bookId] || [];
    const total = book.chapters.reduce((s, ch) => s + ch.sections.length, 0);
    const done = completed.length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header" style="margin-bottom:10px">
        <span class="card-title">${book.name}</span>
        <span class="meta-badge ${pct === 100 ? 'done' : ''}">${done}/${total} · ${pct}%</span>
      </div>
      <div class="book-progress-bar" style="margin-bottom:14px">
        <div class="book-progress-fill" style="width:${pct}%"></div>
      </div>
      ${book.chapters.map(ch => `
        <div class="chapter-block">
          <div class="chapter-title">${ch.name}</div>
          ${ch.sections.map(sec => `
            <label class="check-label">
              <input type="checkbox"
                data-book="${bookId}"
                data-section="${sec.id}"
                ${completed.includes(sec.id) ? 'checked' : ''}>
              <span>${sec.name}</span>
            </label>
          `).join('')}
        </div>
      `).join('')}
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => toggleSection(cb.dataset.book, cb.dataset.section, cb.checked));
  });
}

async function toggleSection(bookId, sectionId, isChecked) {
  const completed = [...(progressData[bookId] || [])];
  if (isChecked && !completed.includes(sectionId)) {
    completed.push(sectionId);
  } else if (!isChecked) {
    const idx = completed.indexOf(sectionId);
    if (idx > -1) completed.splice(idx, 1);
  }
  progressData[bookId] = completed;

  try {
    await db.collection('progress').doc(`${adminStudent}_${bookId}`).set({ completed });
    updateStatProgress();
  } catch (e) {
    showToast('저장 실패: ' + e.message, 'error');
    const cb = document.querySelector(`input[data-book="${bookId}"][data-section="${sectionId}"]`);
    if (cb) cb.checked = !isChecked;
    progressData[bookId] = progressData[bookId].filter(id => id !== sectionId);
    if (!isChecked && !progressData[bookId].includes(sectionId)) progressData[bookId].push(sectionId);
  }
}

// ===== FILE PREVIEW =====
function setupFilePreview() {
  document.getElementById('photo-files').addEventListener('change', e => {
    const files = e.target.files;
    const preview = document.getElementById('file-preview');
    if (files.length > 0) {
      preview.textContent = `✓ ${files.length}장 선택됨`;
      preview.style.color = 'var(--success)';
    } else {
      preview.textContent = '';
    }
  });
}

// ===== DRAG & DROP =====
function setupDragDrop() {
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const dt = e.dataTransfer;
    if (dt.files.length) {
      // Update file preview label
      const preview = document.getElementById('file-preview');
      preview.textContent = `✓ ${dt.files.length}장 선택됨`;
      preview.style.color = 'var(--success)';
      // Store files reference for upload
      zone.dataset.droppedCount = dt.files.length;
      zone._droppedFiles = dt.files;
    }
  });
}

// ===== UPLOAD =====
document.getElementById('upload-btn').addEventListener('click', async () => {
  const dateVal = document.getElementById('upload-date').value;
  const zone = document.getElementById('upload-zone');
  const inputFiles = document.getElementById('photo-files').files;
  const files = (zone._droppedFiles && zone._droppedFiles.length > 0) ? zone._droppedFiles : inputFiles;

  const btn = document.getElementById('upload-btn');
  const progressDiv = document.getElementById('upload-progress');
  const statusEl = document.getElementById('upload-status');
  const barEl = document.getElementById('upload-bar');

  if (!dateVal) { showToast('날짜를 선택해주세요.', 'error'); return; }
  if (!files || !files.length) { showToast('사진을 선택해주세요.', 'error'); return; }

  btn.disabled = true;
  progressDiv.classList.remove('hidden');
  barEl.style.width = '0%';
  statusEl.textContent = '업로드 준비 중...';

  try {
    const docRef = db.collection('photos').doc(`${adminStudent}_${dateVal}`);
    const existing = await docRef.get();
    const existingUrls = existing.exists ? (existing.data().urls || []) : [];

    const newUrls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = storage.ref(`photos/${adminStudent}/${dateVal}/${Date.now()}_${file.name}`);
      const snap = await storageRef.put(file);
      const url = await snap.ref.getDownloadURL();
      newUrls.push(url);
      const pct = Math.round((i + 1) / files.length * 100);
      barEl.style.width = pct + '%';
      statusEl.textContent = `업로드 중... ${i + 1}/${files.length}`;
    }

    await docRef.set({ studentId: adminStudent, date: dateVal, urls: [...existingUrls, ...newUrls] });

    showToast(`✓ ${files.length}장 업로드 완료!`, 'success');
    document.getElementById('photo-files').value = '';
    document.getElementById('file-preview').textContent = '';
    zone._droppedFiles = null;

    setTimeout(() => { progressDiv.classList.add('hidden'); barEl.style.width = '0%'; }, 2000);

    // Refresh stats
    const allSnap = await db.collection('photos').where('studentId', '==', adminStudent).get();
    document.getElementById('stat-photos').textContent = allSnap.size + '일';

  } catch (e) {
    showToast('업로드 실패: ' + e.message, 'error');
    progressDiv.classList.add('hidden');
  } finally {
    btn.disabled = false;
  }
});

// ===== VIEW PHOTOS =====
document.getElementById('view-btn').addEventListener('click', viewPhotos);

async function viewPhotos() {
  const dateVal = document.getElementById('view-date').value;
  if (!dateVal) { showToast('날짜를 선택해주세요.', 'error'); return; }

  const gallery = document.getElementById('admin-photo-gallery');
  gallery.innerHTML = '<div class="loading">불러오는 중...</div>';

  try {
    const snap = await db.collection('photos').doc(`${adminStudent}_${dateVal}`).get();

    if (!snap.exists || !snap.data().urls?.length) {
      gallery.innerHTML = '<p style="color:var(--text-muted);padding:16px 0;text-align:center;font-size:0.875rem">등록된 사진이 없습니다.</p>';
      return;
    }

    const urls = snap.data().urls;
    gallery.innerHTML = '';

    urls.forEach((url, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'admin-photo-wrap';
      wrap.innerHTML = `
        <img src="${url}" class="gallery-img" alt="사진 ${i + 1}" loading="lazy">
        <button class="del-btn" data-url="${url}" data-date="${dateVal}" title="삭제">✕</button>
      `;
      gallery.appendChild(wrap);
    });

    gallery.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePhoto(btn.dataset.date, btn.dataset.url));
    });
  } catch (e) {
    gallery.innerHTML = '<p style="color:var(--danger);font-size:0.875rem">불러오기 실패</p>';
  }
}

// ===== DELETE PHOTO =====
async function deletePhoto(dateVal, url) {
  if (!confirm('이 사진을 삭제하시겠습니까?')) return;
  try {
    const docRef = db.collection('photos').doc(`${adminStudent}_${dateVal}`);
    const snap = await docRef.get();
    const urls = snap.data().urls.filter(u => u !== url);
    await docRef.update({ urls });
    showToast('사진이 삭제되었습니다.', 'success');
    viewPhotos();
  } catch (e) {
    showToast('삭제 실패: ' + e.message, 'error');
  }
}
