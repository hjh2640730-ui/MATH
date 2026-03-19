firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

const ADMIN_PASSWORD = 'math1234';
const AVATAR_COLORS = { kimsiying: '#2563EB', umtaehyun: '#0EA5E9' };
const BOOK_ICONS = {
  rpm_mid1_1: '📗', gaenym_mid1_1: '📘', gaenym_mid1_2: '📙',
  rpm_common1: '📕', ssen_common1: '📓'
};

// ===== STATE =====
let currentStudent = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let photoDateMap = {};
let lightboxImages = [];
let lightboxIndex = 0;
let allProgressData = {};

// ===== DOM =====
const studentSelectEl = document.getElementById('student-select');
const studentDetailEl = document.getElementById('student-detail');

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

// ===== ADMIN ACCESS =====
document.getElementById('admin-access-btn').addEventListener('click', () => {
  document.getElementById('admin-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('admin-pw-input').focus(), 100);
});

document.getElementById('admin-modal-close').addEventListener('click', closeAdminModal);
document.getElementById('admin-modal-overlay').addEventListener('click', closeAdminModal);

function closeAdminModal() {
  document.getElementById('admin-modal').classList.add('hidden');
  document.getElementById('admin-pw-input').value = '';
  document.getElementById('admin-pw-error').classList.add('hidden');
}

document.getElementById('admin-login-btn').addEventListener('click', tryAdminLogin);
document.getElementById('admin-pw-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') tryAdminLogin();
});

function tryAdminLogin() {
  const pw = document.getElementById('admin-pw-input').value;
  if (pw === ADMIN_PASSWORD) {
    window.location.href = 'admin.html';
  } else {
    document.getElementById('admin-pw-error').classList.remove('hidden');
    document.getElementById('admin-pw-input').value = '';
    document.getElementById('admin-pw-input').focus();
  }
}

// ===== STUDENT SELECTION =====
document.querySelectorAll('.student-card').forEach(card => {
  card.addEventListener('click', () => selectStudent(card.dataset.student));
});

document.getElementById('back-btn').addEventListener('click', () => {
  studentDetailEl.classList.add('hidden');
  studentSelectEl.classList.remove('hidden');
  currentStudent = null;
  allProgressData = {};
  photoDateMap = {};
});

async function selectStudent(studentId) {
  currentStudent = studentId;
  const student = STUDENTS[studentId];

  const avatarEl = document.getElementById('detail-avatar');
  avatarEl.textContent = student.name[0];
  avatarEl.style.background = AVATAR_COLORS[studentId] || 'var(--primary)';
  document.getElementById('detail-name').textContent = student.name;
  document.getElementById('detail-school').textContent = student.school;

  studentSelectEl.classList.add('hidden');
  studentDetailEl.classList.remove('hidden');
  studentDetailEl.classList.add('page-enter');
  setTimeout(() => studentDetailEl.classList.remove('page-enter'), 400);

  // Reset summary
  document.getElementById('summary-pct').textContent = '—';
  document.getElementById('summary-done').textContent = '—';
  document.getElementById('summary-days').textContent = '—';

  switchTab('progress');

  // Load progress and photos in parallel
  await Promise.all([
    loadProgress(),
    loadCalendarPhotos().then(() => {
      renderCalendar();
      document.getElementById('summary-days').textContent =
        Object.keys(photoDateMap).length + '일';
    })
  ]);
}

// ===== TABS =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tabName)
  );
  document.getElementById('tab-progress').classList.toggle('hidden', tabName !== 'progress');
  document.getElementById('tab-calendar').classList.toggle('hidden', tabName !== 'calendar');
}

// ===== PROGRESS =====
async function loadProgress() {
  const list = document.getElementById('progress-list');
  // Skeleton loading
  list.innerHTML = [1, 2].map(() => `
    <div class="book-card" style="padding:15px 16px">
      <div style="display:flex;gap:12px;align-items:center">
        <div class="skeleton" style="width:36px;height:36px;border-radius:10px;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="skeleton" style="height:13px;width:55%;margin-bottom:9px"></div>
          <div class="skeleton" style="height:5px;width:100%"></div>
        </div>
        <div class="skeleton" style="width:40px;height:22px;border-radius:999px"></div>
      </div>
    </div>
  `).join('');

  const student = STUDENTS[currentStudent];
  allProgressData = {};

  for (const bookId of student.books) {
    try {
      const snap = await db.collection('progress').doc(`${currentStudent}_${bookId}`).get();
      allProgressData[bookId] = snap.exists ? (snap.data().completed || []) : [];
    } catch {
      allProgressData[bookId] = [];
    }
  }

  renderProgress(allProgressData);
  updateSummary();
}

function updateSummary() {
  const student = STUDENTS[currentStudent];
  let totalDone = 0, totalAll = 0;
  student.books.forEach(bookId => {
    const book = BOOKS[bookId];
    totalDone += (allProgressData[bookId] || []).length;
    totalAll += book.chapters.reduce((s, ch) => s + ch.sections.length, 0);
  });
  const pct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;
  document.getElementById('summary-pct').textContent = pct + '%';
  document.getElementById('summary-done').textContent = `${totalDone}/${totalAll}`;
}

function renderProgress(progressData) {
  const student = STUDENTS[currentStudent];
  const list = document.getElementById('progress-list');
  list.innerHTML = '';

  student.books.forEach(bookId => {
    const book = BOOKS[bookId];
    const completed = progressData[bookId] || [];
    const total = book.chapters.reduce((s, ch) => s + ch.sections.length, 0);
    const done = completed.length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    const icon = BOOK_ICONS[bookId] || '📚';

    const el = document.createElement('div');
    el.className = 'book-card';
    el.innerHTML = `
      <div class="book-header" onclick="toggleBook('${bookId}')">
        <div class="book-icon">${icon}</div>
        <div class="book-title-wrap">
          <div class="book-title">${book.name}</div>
          <div class="book-progress-bar">
            <div class="book-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="book-meta">
          <span class="meta-badge ${pct === 100 ? 'done' : ''}">${pct}%</span>
          <span class="chevron" id="chevron-${bookId}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
      </div>
      <div class="book-body" id="body-${bookId}">
        <div style="padding:10px 10px 2px;font-size:0.78rem;color:var(--text-muted)">${done}/${total} 단원 완료</div>
        ${book.chapters.map(ch => `
          <div class="chapter-block">
            <div class="chapter-title">${ch.name}</div>
            ${ch.sections.map(sec => `
              <div class="section-row ${completed.includes(sec.id) ? 'done' : ''}">
                <span class="sec-icon">${completed.includes(sec.id) ? '✓' : ''}</span>
                <span class="sec-name">${sec.name}</span>
                ${completed.includes(sec.id) ? '<span class="badge-done">완료</span>' : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
    list.appendChild(el);
  });
}

function toggleBook(bookId) {
  const body = document.getElementById(`body-${bookId}`);
  const chevron = document.getElementById(`chevron-${bookId}`);
  const open = body.classList.toggle('open');
  chevron.classList.toggle('open', open);
}

// ===== CALENDAR =====
document.getElementById('prev-month').addEventListener('click', () => {
  calendarMonth--;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  loadCalendarPhotos().then(renderCalendar);
});

document.getElementById('next-month').addEventListener('click', () => {
  calendarMonth++;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  loadCalendarPhotos().then(renderCalendar);
});

async function loadCalendarPhotos() {
  photoDateMap = {};
  try {
    const snap = await db.collection('photos')
      .where('studentId', '==', currentStudent)
      .get();
    snap.forEach(doc => {
      const d = doc.data();
      if (d.date && d.urls) photoDateMap[d.date] = d.urls;
    });
  } catch (e) {
    console.error('사진 로드 실패:', e);
  }
}

function renderCalendar() {
  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('calendar-title').textContent = `${calendarYear}년 ${MONTHS[calendarMonth]}`;

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = new Date();
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell empty';
    grid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const photos = photoDateMap[dateStr];
    const hasPhoto = !!photos;
    const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === day;
    const dayOfWeek = new Date(calendarYear, calendarMonth, day).getDay();

    const cell = document.createElement('div');
    cell.className = `cal-cell${hasPhoto ? ' has-photo' : ''}${isToday ? ' is-today' : ''}`;

    const numEl = document.createElement('span');
    numEl.className = `cal-num${dayOfWeek === 0 ? ' sun' : dayOfWeek === 6 ? ' sat' : ''}`;
    numEl.textContent = day;
    cell.appendChild(numEl);

    if (hasPhoto) {
      const badge = document.createElement('span');
      badge.className = 'photo-count-badge';
      badge.textContent = photos.length;
      cell.appendChild(badge);
      cell.addEventListener('click', () => openPhotoModal(dateStr));
    }

    grid.appendChild(cell);
  }
}

// ===== PHOTO MODAL =====
function openPhotoModal(dateStr) {
  const urls = photoDateMap[dateStr] || [];
  const [y, m, d] = dateStr.split('-');
  document.getElementById('modal-title').textContent = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 학습 사진`;

  const gallery = document.getElementById('photo-gallery');
  gallery.innerHTML = '';
  lightboxImages = urls;

  urls.forEach((url, i) => {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'gallery-img';
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(i));
    gallery.appendChild(img);
  });

  document.getElementById('photo-modal').classList.remove('hidden');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', closeModal);
function closeModal() { document.getElementById('photo-modal').classList.add('hidden'); }

// ===== LIGHTBOX =====
function openLightbox(index) {
  lightboxIndex = index;
  showLbImage(index);
  document.getElementById('lightbox').classList.remove('hidden');
}

function showLbImage(index) {
  if (index < 0) index = lightboxImages.length - 1;
  if (index >= lightboxImages.length) index = 0;
  lightboxIndex = index;
  document.getElementById('lb-img').src = lightboxImages[index];
  const multi = lightboxImages.length > 1;
  document.getElementById('lb-prev').style.visibility = multi ? '' : 'hidden';
  document.getElementById('lb-next').style.visibility = multi ? '' : 'hidden';
}

document.getElementById('lb-close').addEventListener('click', () => document.getElementById('lightbox').classList.add('hidden'));
document.getElementById('lb-prev').addEventListener('click', () => showLbImage(lightboxIndex - 1));
document.getElementById('lb-next').addEventListener('click', () => showLbImage(lightboxIndex + 1));

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  const modal = document.getElementById('photo-modal');
  const adminModal = document.getElementById('admin-modal');
  if (!lb.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') showLbImage(lightboxIndex - 1);
    if (e.key === 'ArrowRight') showLbImage(lightboxIndex + 1);
    if (e.key === 'Escape') lb.classList.add('hidden');
  } else if (!modal.classList.contains('hidden') && e.key === 'Escape') {
    closeModal();
  } else if (!adminModal.classList.contains('hidden') && e.key === 'Escape') {
    closeAdminModal();
  }
});
