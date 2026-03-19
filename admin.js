const ADMIN_PASSWORD = '1234';

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
const storage = firebase.storage();

// ===== STATE =====
let adminStudent = 'kimsiying';
let statusData = {}; // { bookId: { sectionId: 'done'|'inprogress'|'none' } }

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
      if (snap.exists) {
        const d = snap.data();
        const st = d.status || {};
        const done = Object.values(st).filter(v => v === 'done').length;
        totalDone += done;
      }
      const book = BOOKS[bookId];
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
    const st = statusData[bookId] || {};
    totalDone += Object.values(st).filter(v => v === 'done').length;
    const book = BOOKS[bookId];
    totalAll += book.chapters.reduce((s, ch) => s + ch.sections.length, 0);
  });
  const pct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;
  document.getElementById('stat-pct').textContent = pct + '%';
  document.getElementById('stat-done').textContent = `${totalDone}/${totalAll}`;
}

// ===== ADMIN PROGRESS =====
async function loadAdminProgress() {
  statusData = {};
  const student = STUDENTS[adminStudent];
  const list = document.getElementById('admin-progress-list');
  list.innerHTML = '<div class="loading">불러오는 중...</div>';

  for (const bookId of student.books) {
    try {
      const snap = await db.collection('progress').doc(`${adminStudent}_${bookId}`).get();
      if (snap.exists) {
        const d = snap.data();
        if (d.status) {
          statusData[bookId] = d.status;
        } else if (d.completed) {
          // 기존 데이터 마이그레이션
          statusData[bookId] = {};
          d.completed.forEach(id => { statusData[bookId][id] = 'done'; });
        } else {
          statusData[bookId] = {};
        }
      } else {
        statusData[bookId] = {};
      }
    } catch {
      statusData[bookId] = {};
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
    const st = statusData[bookId] || {};
    const total = book.chapters.reduce((s, ch) => s + ch.sections.length, 0);
    const done = Object.values(st).filter(v => v === 'done').length;
    const inprog = Object.values(st).filter(v => v === 'inprogress').length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header" style="margin-bottom:10px">
        <span class="card-title">${book.name}</span>
        <span class="meta-badge ${pct === 100 ? 'done' : ''}">완료 ${done}/${total}</span>
      </div>
      <div class="book-progress-bar" style="margin-bottom:14px">
        <div class="book-progress-fill" style="width:${pct}%"></div>
      </div>
      ${book.chapters.map(ch => `
        <div class="chapter-block">
          <div class="chapter-title">${ch.name}</div>
          ${ch.sections.map(sec => {
            const cur = st[sec.id] || 'none';
            return `
              <div class="section-admin-row">
                <span class="sec-admin-name">${sec.name}</span>
                <div class="status-btn-group">
                  <button class="status-btn ${cur === 'none' ? 'active-none' : ''}"
                    data-book="${bookId}" data-section="${sec.id}" data-status="none">미진행</button>
                  <button class="status-btn ${cur === 'inprogress' ? 'active-inprogress' : ''}"
                    data-book="${bookId}" data-section="${sec.id}" data-status="inprogress">진행중</button>
                  <button class="status-btn ${cur === 'done' ? 'active-done' : ''}"
                    data-book="${bookId}" data-section="${sec.id}" data-status="done">완료</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `).join('')}
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => setStatus(btn.dataset.book, btn.dataset.section, btn.dataset.status));
  });
}

async function setStatus(bookId, sectionId, newStatus) {
  if (!statusData[bookId]) statusData[bookId] = {};
  const prev = statusData[bookId][sectionId] || 'none';
  statusData[bookId][sectionId] = newStatus;

  // UI 즉시 반영
  const btns = document.querySelectorAll(`[data-book="${bookId}"][data-section="${sectionId}"]`);
  btns.forEach(b => {
    b.className = 'status-btn';
    if (b.dataset.status === newStatus) {
      b.classList.add(`active-${newStatus}`);
    }
  });

  // 진도바 업데이트
  updateStatProgress();

  try {
    const st = statusData[bookId];
    const completed = Object.entries(st).filter(([,v]) => v === 'done').map(([k]) => k);
    await db.collection('progress').doc(`${adminStudent}_${bookId}`).set({ status: st, completed });
  } catch (e) {
    showToast('저장 실패: ' + e.message, 'error');
    // 롤백
    statusData[bookId][sectionId] = prev;
    const btns2 = document.querySelectorAll(`[data-book="${bookId}"][data-section="${sectionId}"]`);
    btns2.forEach(b => {
      b.className = 'status-btn';
      if (b.dataset.status === prev) b.classList.add(`active-${prev}`);
    });
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
      const preview = document.getElementById('file-preview');
      preview.textContent = `✓ ${dt.files.length}장 선택됨`;
      preview.style.color = 'var(--success)';
      zone._droppedFiles = dt.files;
    }
  });
}

// ===== IMAGE COMPRESS =====
function compressImage(file, maxPx = 1920, quality = 0.82) {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w <= maxPx && h <= maxPx) { resolve(file); return; }
      if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
      else { w = Math.round(w * maxPx / h); h = maxPx; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ===== UPLOAD =====
document.getElementById('upload-btn').addEventListener('click', async () => {
  const dateVal = document.getElementById('upload-date').value;
  const zone = document.getElementById('upload-zone');
  const inputFiles = document.getElementById('photo-files').files;
  const files = Array.from((zone._droppedFiles && zone._droppedFiles.length > 0) ? zone._droppedFiles : inputFiles);

  const btn = document.getElementById('upload-btn');
  const progressDiv = document.getElementById('upload-progress');
  const statusEl = document.getElementById('upload-status');
  const barEl = document.getElementById('upload-bar');

  if (!dateVal) { showToast('날짜를 선택해주세요.', 'error'); return; }
  if (!files.length) { showToast('사진을 선택해주세요.', 'error'); return; }

  btn.disabled = true;
  progressDiv.classList.remove('hidden');
  barEl.style.width = '0%';
  statusEl.textContent = `압축 중... (0/${files.length})`;

  try {
    // 압축 병렬
    const compressed = await Promise.all(files.map((f, i) =>
      compressImage(f).then(c => { statusEl.textContent = `압축 중... (${i + 1}/${files.length})`; return c; })
    ));

    const docRef = db.collection('photos').doc(`${adminStudent}_${dateVal}`);
    const existing = await docRef.get();
    const existingUrls = existing.exists ? (existing.data().urls || []) : [];

    let done = 0;
    statusEl.textContent = `업로드 중... (0/${files.length})`;

    // 업로드 병렬
    const newUrls = await Promise.all(compressed.map(async (file, i) => {
      const ref = storage.ref(`photos/${adminStudent}/${dateVal}/${Date.now()}_${i}_${file.name}`);
      const snap = await ref.put(file);
      const url = await snap.ref.getDownloadURL();
      done++;
      barEl.style.width = Math.round(done / files.length * 100) + '%';
      statusEl.textContent = `업로드 중... (${done}/${files.length})`;
      return url;
    }));

    await docRef.set({ studentId: adminStudent, date: dateVal, urls: [...existingUrls, ...newUrls] });

    showToast(`✓ ${files.length}장 업로드 완료!`, 'success');
    document.getElementById('photo-files').value = '';
    document.getElementById('file-preview').textContent = '';
    zone._droppedFiles = null;
    setTimeout(() => { progressDiv.classList.add('hidden'); barEl.style.width = '0%'; }, 2000);

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
        <button class="del-btn" data-url="${url}" data-date="${dateVal}">✕</button>
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
