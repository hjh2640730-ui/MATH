// 관리자 비밀번호 - 원하는 비밀번호로 변경하세요
const ADMIN_PASSWORD = 'math1234';

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
const storage = firebase.storage();

// ===== 상태 =====
let adminStudent = 'kimsiying';
let progressData = {};

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('upload-date').value = todayStr();
  document.getElementById('view-date').value = todayStr();
});

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ===== 로그인 =====
document.getElementById('login-btn').addEventListener('click', tryLogin);
document.getElementById('pw-input').addEventListener('keypress', e => {
  if (e.key === 'Enter') tryLogin();
});

function tryLogin() {
  const pw = document.getElementById('pw-input').value;
  if (pw === ADMIN_PASSWORD) {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    loadAdminProgress();
  } else {
    document.getElementById('login-error').classList.remove('hidden');
  }
}

// ===== 학생 선택 =====
document.querySelectorAll('[data-student]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-student]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    adminStudent = btn.dataset.student;
    loadAdminProgress();
  });
});

// ===== 탭 =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab.dataset.tab));
    document.getElementById('tab-admin-progress').classList.toggle('hidden', tab.dataset.tab !== 'admin-progress');
    document.getElementById('tab-admin-photos').classList.toggle('hidden', tab.dataset.tab !== 'admin-photos');
  });
});

// ===== 진도 관리 =====
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

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="book-admin-header">
        <h3>${book.name}</h3>
        <span class="meta-count">${done}/${total} 완료</span>
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

  // 체크박스 이벤트
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
  } catch (e) {
    alert('저장 실패: ' + e.message);
    // 체크 상태 원복
    const cb = document.querySelector(`input[data-book="${bookId}"][data-section="${sectionId}"]`);
    if (cb) cb.checked = !isChecked;
  }
}

// ===== 사진 업로드 =====
document.getElementById('upload-btn').addEventListener('click', async () => {
  const dateVal = document.getElementById('upload-date').value;
  const files = document.getElementById('photo-files').files;
  const statusEl = document.getElementById('upload-status');
  const btn = document.getElementById('upload-btn');

  if (!dateVal) { alert('날짜를 선택해주세요.'); return; }
  if (!files.length) { alert('사진을 선택해주세요.'); return; }

  btn.disabled = true;
  statusEl.textContent = '업로드 중...';
  statusEl.classList.remove('hidden');

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
      statusEl.textContent = `업로드 중... (${i + 1}/${files.length})`;
    }

    await docRef.set({
      studentId: adminStudent,
      date: dateVal,
      urls: [...existingUrls, ...newUrls]
    });

    statusEl.textContent = `✓ ${files.length}장 업로드 완료!`;
    document.getElementById('photo-files').value = '';
    setTimeout(() => statusEl.classList.add('hidden'), 3000);
  } catch (e) {
    statusEl.textContent = '업로드 실패: ' + e.message;
  } finally {
    btn.disabled = false;
  }
});

// ===== 사진 조회 =====
document.getElementById('view-btn').addEventListener('click', viewPhotos);

async function viewPhotos() {
  const dateVal = document.getElementById('view-date').value;
  if (!dateVal) { alert('날짜를 선택해주세요.'); return; }

  const gallery = document.getElementById('admin-photo-gallery');
  gallery.innerHTML = '<div class="loading">불러오는 중...</div>';

  try {
    const snap = await db.collection('photos').doc(`${adminStudent}_${dateVal}`).get();

    if (!snap.exists || !snap.data().urls?.length) {
      gallery.innerHTML = '<p style="color:var(--text-muted);padding:16px 0">등록된 사진이 없습니다.</p>';
      return;
    }

    const urls = snap.data().urls;
    gallery.innerHTML = '';

    urls.forEach((url, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'admin-photo-wrap';
      wrap.innerHTML = `
        <img src="${url}" class="gallery-img" alt="사진 ${i + 1}">
        <button class="del-btn" data-url="${url}" data-date="${dateVal}">✕</button>
      `;
      gallery.appendChild(wrap);
    });

    gallery.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePhoto(btn.dataset.date, btn.dataset.url));
    });
  } catch (e) {
    gallery.innerHTML = '<p style="color:#EF4444">불러오기 실패</p>';
  }
}

async function deletePhoto(dateVal, url) {
  if (!confirm('이 사진을 삭제하시겠습니까?')) return;

  try {
    const docRef = db.collection('photos').doc(`${adminStudent}_${dateVal}`);
    const snap = await docRef.get();
    const urls = snap.data().urls.filter(u => u !== url);
    await docRef.update({ urls });
    viewPhotos();
  } catch (e) {
    alert('삭제 실패: ' + e.message);
  }
}
