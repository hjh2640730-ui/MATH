firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

// ===== 상태 =====
let currentStudent = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let photoDateMap = {};
let lightboxImages = [];
let lightboxIndex = 0;

// ===== DOM =====
const studentSelectEl = document.getElementById('student-select');
const studentDetailEl = document.getElementById('student-detail');

// ===== 학생 선택 =====
document.querySelectorAll('.student-card').forEach(card => {
  card.addEventListener('click', () => selectStudent(card.dataset.student));
});

document.getElementById('back-btn').addEventListener('click', () => {
  studentDetailEl.classList.add('hidden');
  studentSelectEl.classList.remove('hidden');
  currentStudent = null;
});

async function selectStudent(studentId) {
  currentStudent = studentId;
  const student = STUDENTS[studentId];

  document.getElementById('detail-avatar').textContent = student.name[0];
  document.getElementById('detail-name').textContent = student.name;
  document.getElementById('detail-school').textContent = student.school;

  studentSelectEl.classList.add('hidden');
  studentDetailEl.classList.remove('hidden');

  switchTab('progress');
  await loadProgress();
  await loadCalendarPhotos();
  renderCalendar();
}

// ===== 탭 =====
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

// ===== 진도현황 =====
async function loadProgress() {
  const list = document.getElementById('progress-list');
  list.innerHTML = '<div class="loading">불러오는 중...</div>';

  const student = STUDENTS[currentStudent];
  const progressData = {};

  for (const bookId of student.books) {
    try {
      const snap = await db.collection('progress').doc(`${currentStudent}_${bookId}`).get();
      progressData[bookId] = snap.exists ? (snap.data().completed || []) : [];
    } catch {
      progressData[bookId] = [];
    }
  }

  renderProgress(progressData);
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

    const el = document.createElement('div');
    el.className = 'book-card';
    el.innerHTML = `
      <div class="book-header" onclick="toggleBook('${bookId}')">
        <span class="book-title">${book.name}</span>
        <div class="book-meta">
          <span class="meta-count">${done}/${total}</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span class="meta-pct">${pct}%</span>
          <span class="chevron" id="chevron-${bookId}">▼</span>
        </div>
      </div>
      <div class="book-body" id="body-${bookId}">
        ${book.chapters.map(ch => `
          <div class="chapter-block">
            <div class="chapter-title">${ch.name}</div>
            ${ch.sections.map(sec => `
              <div class="section-row ${completed.includes(sec.id) ? 'done' : ''}">
                <span class="sec-icon">${completed.includes(sec.id) ? '✓' : '○'}</span>
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
  chevron.textContent = open ? '▲' : '▼';
}

// ===== 달력 =====
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
    const hasPhoto = !!photoDateMap[dateStr];
    const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === day;
    const dayOfWeek = new Date(calendarYear, calendarMonth, day).getDay();

    const cell = document.createElement('div');
    cell.className = `cal-cell${hasPhoto ? ' has-photo' : ''}${isToday ? ' is-today' : ''}`;

    const numEl = document.createElement('span');
    numEl.className = `cal-num${dayOfWeek === 0 ? ' sun' : dayOfWeek === 6 ? ' sat' : ''}`;
    numEl.textContent = day;
    cell.appendChild(numEl);

    if (hasPhoto) {
      const dot = document.createElement('span');
      dot.className = 'photo-dot';
      cell.appendChild(dot);
      cell.addEventListener('click', () => openPhotoModal(dateStr));
    }

    grid.appendChild(cell);
  }
}

// ===== 사진 모달 =====
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

function closeModal() {
  document.getElementById('photo-modal').classList.add('hidden');
}

// ===== 라이트박스 =====
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
  document.getElementById('lb-prev').style.visibility = lightboxImages.length > 1 ? '' : 'hidden';
  document.getElementById('lb-next').style.visibility = lightboxImages.length > 1 ? '' : 'hidden';
}

document.getElementById('lb-close').addEventListener('click', () => document.getElementById('lightbox').classList.add('hidden'));
document.getElementById('lb-prev').addEventListener('click', () => showLbImage(lightboxIndex - 1));
document.getElementById('lb-next').addEventListener('click', () => showLbImage(lightboxIndex + 1));

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  const modal = document.getElementById('photo-modal');
  if (!lb.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') showLbImage(lightboxIndex - 1);
    if (e.key === 'ArrowRight') showLbImage(lightboxIndex + 1);
    if (e.key === 'Escape') lb.classList.add('hidden');
  } else if (!modal.classList.contains('hidden') && e.key === 'Escape') {
    closeModal();
  }
});
