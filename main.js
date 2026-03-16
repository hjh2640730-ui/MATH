// ================================================================
//  MATH ACADEMY - Learning Management System
//  localStorage 기반 SPA (Firebase 없이 바로 사용 가능)
// ================================================================

const KEY = 'ma_';
const Store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(KEY + k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); return true; } catch(e) { showToast('저장 공간이 부족합니다. 오래된 사진을 삭제해 주세요.'); return false; } },

  students: () => Store.get('students') || [],
  saveStudents: (v) => Store.set('students', v),

  workbooks: () => Store.get('workbooks') || [],
  saveWorkbooks: (v) => Store.set('workbooks', v),

  progress: () => Store.get('progress') || {},
  saveProgress: (v) => Store.set('progress', v),
  getStudentProgress: (sid, wid) => (Store.progress()[`${sid}__${wid}`] || {}),
  setItemStatus: (sid, wid, itemId, status) => {
    const all = Store.progress();
    const key = `${sid}__${wid}`;
    if (!all[key]) all[key] = {};
    all[key][itemId] = status;
    Store.saveProgress(all);
  },

  activities: () => Store.get('activities') || [],
  saveActivities: (v) => Store.set('activities', v),
  getDateActivities: (sid, date) => Store.activities().find(a => a.studentId === sid && a.date === date),
  getActiveDates: (sid) => Store.activities().filter(a => a.studentId === sid).map(a => a.date),
  getActivityCounts: (sid) => {
    const result = {};
    Store.activities().filter(a => a.studentId === sid).forEach(a => { result[a.date] = a.photos.length; });
    return result;
  },
  upsertActivity: (sid, date, photos, note) => {
    const all = Store.activities();
    const idx = all.findIndex(a => a.studentId === sid && a.date === date);
    if (idx >= 0) { all[idx].photos = photos; all[idx].note = note; }
    else all.push({ id: Date.now().toString(), studentId: sid, date, photos, note });
    return Store.saveActivities(all);
  },
  addPhoto: (sid, date, dataUrl) => {
    const all = Store.activities();
    const idx = all.findIndex(a => a.studentId === sid && a.date === date);
    if (idx >= 0) { all[idx].photos.push(dataUrl); }
    else all.push({ id: Date.now().toString(), studentId: sid, date, photos: [dataUrl], note: '' });
    return Store.saveActivities(all);
  },
  removePhoto: (sid, date, photoIdx) => {
    const all = Store.activities();
    const idx = all.findIndex(a => a.studentId === sid && a.date === date);
    if (idx < 0) return;
    all[idx].photos.splice(photoIdx, 1);
    if (all[idx].photos.length === 0) all.splice(idx, 1);
    Store.saveActivities(all);
  },

  password: () => Store.get('password') || 'admin1234',
};

// ================================================================
//  APP STATE
// ================================================================
let S = {
  page: 'landing',      // landing | teacher-login | parent-login | teacher | parent
  teacherTab: 'students', // students | workbooks | progress | photos
  parentStudentId: null,
  parentTab: 'progress',
  expandedWorkbooks: new Set(),
  cal: { year: new Date().getFullYear(), month: new Date().getMonth() },
  selectedDate: null,
  teacherProgStudent: null,
  teacherProgWorkbook: null,
  teacherPhotoStudent: null,
  teacherPhotoDate: todayStr(),
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function nav(page) { S.page = page; render(); }

// ================================================================
//  INIT DEMO DATA
// ================================================================
function initDemo() {
  if (Store.get('initialized_v3')) return;
  localStorage.removeItem(KEY + 'students');
  localStorage.removeItem(KEY + 'workbooks');
  localStorage.removeItem(KEY + 'progress');
  localStorage.removeItem(KEY + 'activities');

  const students = [
    { id: 's1', name: '김범수', grade: '수내고1', workbookIds: [] },
    { id: 's2', name: '김시영', grade: '죽전고1', workbookIds: ['wb1', 'wb2'] },
    { id: 's3', name: '엄태현', grade: '대지중1', workbookIds: ['wb3', 'wb4', 'wb5'] },
  ];

  const workbooks = [
    // ── 김시영 ─────────────────────────────────────
    {
      id: 'wb1',
      title: 'RPM 공통수학1',
      chapters: [
        { id: 'w1c1', title: 'Ⅰ. 다항식', items: [
          { id: 'w1c1i1', title: '1. 다항식의 연산' },
          { id: 'w1c1i2', title: '2. 항등식과 나머지정리' },
          { id: 'w1c1i3', title: '3. 인수분해' },
        ]},
        { id: 'w1c2', title: 'Ⅱ. 방정식과 부등식', items: [
          { id: 'w1c2i1', title: '1. 복소수' },
          { id: 'w1c2i2', title: '2. 이차방정식' },
          { id: 'w1c2i3', title: '3. 이차방정식과 이차함수' },
          { id: 'w1c2i4', title: '4. 여러 가지 방정식' },
          { id: 'w1c2i5', title: '5. 여러 가지 부등식' },
        ]},
        { id: 'w1c3', title: 'Ⅲ. 경우의 수', items: [
          { id: 'w1c3i1', title: '1. 경우의 수와 순열' },
          { id: 'w1c3i2', title: '2. 조합' },
        ]},
        { id: 'w1c4', title: 'Ⅳ. 행렬', items: [
          { id: 'w1c4i1', title: '1. 행렬' },
        ]},
      ],
    },
    {
      id: 'wb2',
      title: '쎈 공통수학1',
      chapters: [
        { id: 'w2c1', title: 'Ⅰ. 다항식', items: [
          { id: 'w2c1i1', title: '01. 다항식의 연산' },
          { id: 'w2c1i2', title: '02. 나머지 정리와 인수분해' },
        ]},
        { id: 'w2c2', title: 'Ⅱ. 방정식', items: [
          { id: 'w2c2i1', title: '03. 복소수' },
          { id: 'w2c2i2', title: '04. 이차방정식' },
          { id: 'w2c2i3', title: '05. 이차방정식과 이차함수' },
          { id: 'w2c2i4', title: '06. 여러 가지 방정식' },
        ]},
        { id: 'w2c3', title: 'Ⅲ. 부등식', items: [
          { id: 'w2c3i1', title: '07. 일차부등식' },
          { id: 'w2c3i2', title: '08. 이차부등식' },
        ]},
        { id: 'w2c4', title: 'Ⅳ. 순열과 조합', items: [
          { id: 'w2c4i1', title: '09. 순열과 조합' },
        ]},
        { id: 'w2c5', title: 'Ⅴ. 행렬', items: [
          { id: 'w2c5i1', title: '10. 행렬과 그 연산' },
        ]},
      ],
    },
    // ── 엄태현 ─────────────────────────────────────
    {
      id: 'wb3',
      title: '개념쎈 중1-1',
      chapters: [
        { id: 'w3c1', title: 'Ⅰ. 수와 연산', items: [
          { id: 'w3c1i1', title: '1. 소인수분해' },
          { id: 'w3c1i2', title: '2. 정수와 유리수' },
          { id: 'w3c1i3', title: '3. 유리수의 계산' },
        ]},
        { id: 'w3c2', title: 'Ⅱ. 방정식', items: [
          { id: 'w3c2i1', title: '4. 문자와 식' },
          { id: 'w3c2i2', title: '5. 일차방정식의 풀이' },
          { id: 'w3c2i3', title: '6. 일차방정식의 활용' },
        ]},
        { id: 'w3c3', title: 'Ⅲ. 그래프와 비례', items: [
          { id: 'w3c3i1', title: '7. 좌표평면과 그래프' },
          { id: 'w3c3i2', title: '8. 정비례와 반비례' },
        ]},
      ],
    },
    {
      id: 'wb4',
      title: '개념쎈 중1-2',
      chapters: [
        { id: 'w4c1', title: 'Ⅰ. 기본 도형', items: [
          { id: 'w4c1i1', title: '1. 기본 도형' },
          { id: 'w4c1i2', title: '2. 위치 관계' },
          { id: 'w4c1i3', title: '3. 작도와 합동' },
        ]},
        { id: 'w4c2', title: 'Ⅱ. 평면도형', items: [
          { id: 'w4c2i1', title: '4. 다각형' },
          { id: 'w4c2i2', title: '5. 원과 부채꼴' },
        ]},
        { id: 'w4c3', title: 'Ⅲ. 입체도형', items: [
          { id: 'w4c3i1', title: '6. 다면체와 회전체' },
          { id: 'w4c3i2', title: '7. 입체도형의 겉넓이와 부피' },
        ]},
        { id: 'w4c4', title: 'Ⅳ. 통계', items: [
          { id: 'w4c4i1', title: '8. 자료의 정리와 해석' },
        ]},
      ],
    },
    {
      id: 'wb5',
      title: 'RPM 중1-1',
      chapters: [
        { id: 'w5c1', title: 'Ⅰ. 소인수분해', items: [
          { id: 'w5c1i1', title: '1. 소인수분해' },
          { id: 'w5c1i2', title: '2. 최대공약수와 최소공배수' },
        ]},
        { id: 'w5c2', title: 'Ⅱ. 정수와 유리수', items: [
          { id: 'w5c2i1', title: '3. 정수와 유리수' },
          { id: 'w5c2i2', title: '4. 정수와 유리수의 계산' },
        ]},
        { id: 'w5c3', title: 'Ⅲ. 문자와 식', items: [
          { id: 'w5c3i1', title: '5. 문자의 사용과 식의 계산' },
          { id: 'w5c3i2', title: '6. 일차방정식의 풀이' },
          { id: 'w5c3i3', title: '7. 일차방정식의 활용' },
        ]},
        { id: 'w5c4', title: 'Ⅳ. 좌표평면과 그래프', items: [
          { id: 'w5c4i1', title: '8. 좌표와 그래프' },
          { id: 'w5c4i2', title: '9. 정비례와 반비례' },
        ]},
      ],
    },
  ];

  Store.saveStudents(students);
  Store.saveWorkbooks(workbooks);
  Store.saveProgress({});
  Store.set('initialized_v3', true);
}

// ================================================================
//  UTILITY
// ================================================================
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function showToast(msg, duration = 2500) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

function getDayOfWeek(str) {
  const days = ['일','월','화','수','목','금','토'];
  return days[new Date(str).getDay()];
}

function statusLabel(s) {
  return { completed: '진행완료', in_progress: '진행중', not_started: '아직 안 품' }[s] || '아직 안 품';
}

function calcProgress(sid, wid, workbook) {
  if (!workbook) return { total: 0, completed: 0, in_progress: 0, pct: 0 };
  const prog = Store.getStudentProgress(sid, wid);
  let total = 0, completed = 0, in_progress = 0;
  workbook.chapters.forEach(ch => ch.items.forEach(it => {
    total++;
    const s = prog[it.id] || 'not_started';
    if (s === 'completed') completed++;
    else if (s === 'in_progress') in_progress++;
  }));
  return { total, completed, in_progress, pct: total ? Math.round(completed / total * 100) : 0 };
}

// ================================================================
//  MODAL
// ================================================================
function openModal(html) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal">${html}</div>`;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-root').innerHTML = '';
}

window.closeModal = closeModal;

// ================================================================
//  RENDER
// ================================================================
function render() {
  const app = document.getElementById('app');
  switch (S.page) {
    case 'landing':      app.innerHTML = renderLanding(); break;
    case 'teacher-login': app.innerHTML = renderTeacherLogin(); break;
    case 'parent-login':  app.innerHTML = renderParentLogin(); break;
    case 'teacher':       app.innerHTML = renderTeacher(); break;
    case 'parent':        app.innerHTML = renderParent(); break;
  }
}

// ================================================================
//  LANDING
// ================================================================
function renderLanding() {
  return `
  <div class="landing">
    <div class="landing-logo">📐</div>
    <h1 class="landing-title">학습 관리 시스템</h1>
    <p class="landing-subtitle">학생 진도 현황과 학습 일지를 한눈에</p>
    <div class="landing-cards">
      <button class="landing-card" onclick="nav('teacher-login')">
        <div class="icon">👩‍🏫</div>
        <h3>선생님</h3>
        <p>학생 관리 및<br>진도 업데이트</p>
      </button>
      <button class="landing-card" onclick="nav('parent-login')">
        <div class="icon">👨‍👩‍👧</div>
        <h3>학부모</h3>
        <p>우리 아이의<br>학습 현황 보기</p>
      </button>
    </div>
  </div>`;
}

// ================================================================
//  TEACHER LOGIN
// ================================================================
function renderTeacherLogin() {
  return `
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-icon">🔐</div>
      <h2 class="login-title">선생님 로그인</h2>
      <p class="login-sub">관리자 비밀번호를 입력해 주세요</p>
      <div class="form-group">
        <label class="form-label">비밀번호</label>
        <input id="pw-input" type="password" class="form-input" placeholder="비밀번호 입력" onkeydown="if(event.key==='Enter')doTeacherLogin()">
      </div>
      <div id="pw-error" class="login-error hidden">비밀번호가 올바르지 않습니다.</div>
      <button class="btn btn-primary btn-full mt-16" onclick="doTeacherLogin()">로그인</button>
      <button class="btn btn-ghost btn-full mt-8" onclick="nav('landing')">← 돌아가기</button>
      <p class="text-sub text-center mt-16" style="font-size:0.78rem">기본 비밀번호: admin1234</p>
    </div>
  </div>`;
}

window.doTeacherLogin = function() {
  const val = document.getElementById('pw-input')?.value;
  if (val === Store.password()) {
    S.page = 'teacher';
    S.teacherTab = 'students';
    render();
  } else {
    document.getElementById('pw-error')?.classList.remove('hidden');
  }
};

// ================================================================
//  PARENT LOGIN
// ================================================================
function renderParentLogin() {
  const students = Store.students();
  return `
  <div class="login-wrapper">
    <div class="login-card" style="max-width:440px">
      <div class="login-icon">👨‍👩‍👧</div>
      <h2 class="login-title">학부모 페이지</h2>
      <p class="login-sub">자녀 이름을 선택해 주세요</p>
      ${students.length === 0 ? `
        <div style="text-align:center;color:var(--text-sub);padding:24px 0;font-size:0.9rem">
          등록된 학생이 없습니다.<br>선생님께 문의해 주세요.
        </div>
      ` : `
        <div style="display:grid;gap:10px;margin-bottom:20px">
          ${students.map(s => `
            <button onclick="doParentLogin('${s.id}')"
              style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--gray-light);border:1.5px solid var(--gray-border);border-radius:12px;cursor:pointer;font-family:inherit;transition:all 0.15s;text-align:left"
              onmouseover="this.style.borderColor='var(--primary)';this.style.background='var(--primary-light)'"
              onmouseout="this.style.borderColor='var(--gray-border)';this.style.background='var(--gray-light)'">
              <span style="font-size:2rem">👤</span>
              <div>
                <div style="font-size:1rem;font-weight:700;color:var(--text)">${esc(s.name)}</div>
                <div style="font-size:0.82rem;color:var(--text-sub)">${esc(s.grade || '')}</div>
              </div>
            </button>
          `).join('')}
        </div>
      `}
      <button class="btn btn-ghost btn-full" onclick="nav('landing')">← 돌아가기</button>
    </div>
  </div>`;
}

window.doParentLogin = function(sid) {
  const student = Store.students().find(s => s.id === sid);
  if (student) {
    S.parentStudentId = student.id;
    S.parentTab = 'progress';
    S.selectedDate = null;
    S.cal = { year: new Date().getFullYear(), month: new Date().getMonth() };
    S.page = 'parent';
    render();
  }
};

// ================================================================
//  TEACHER DASHBOARD
// ================================================================
function renderTeacher() {
  const tabContent = {
    students: renderTeacherStudents(),
    workbooks: renderTeacherWorkbooks(),
    progress: renderTeacherProgress(),
    photos: renderTeacherPhotos(),
  };
  return `
  <div>
    <div class="header">
      <div class="header-left">
        <span class="header-logo">📐</span>
        <div>
          <div class="header-title">학원 관리자</div>
          <div class="header-subtitle">선생님 모드</div>
        </div>
      </div>
      <button class="btn-back" onclick="nav('landing')">← 나가기</button>
    </div>
    <div class="tabs">
      <button class="tab-btn ${S.teacherTab==='students'?'active':''}" onclick="setTeacherTab('students')">👥 학생 관리</button>
      <button class="tab-btn ${S.teacherTab==='workbooks'?'active':''}" onclick="setTeacherTab('workbooks')">📚 문제집 관리</button>
      <button class="tab-btn ${S.teacherTab==='progress'?'active':''}" onclick="setTeacherTab('progress')">📊 진도 관리</button>
      <button class="tab-btn ${S.teacherTab==='photos'?'active':''}" onclick="setTeacherTab('photos')">📷 사진 업로드</button>
    </div>
    <div class="content">
      ${tabContent[S.teacherTab] || ''}
    </div>
  </div>`;
}

window.setTeacherTab = function(tab) { S.teacherTab = tab; render(); };

// ---------- Students Tab ----------
function renderTeacherStudents() {
  const students = Store.students();
  const workbooks = Store.workbooks();

  return `
  <div>
    <div class="section-header">
      <div class="section-title">학생 목록 (${students.length}명)</div>
      <button class="btn btn-primary btn-sm" onclick="openAddStudentModal()">+ 학생 추가</button>
    </div>
    ${students.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-title">등록된 학생이 없습니다</div>
        <div class="empty-text">학생을 추가해 주세요</div>
      </div>
    ` : `
    <div class="student-list">
      ${students.map(s => {
        const wbs = (s.workbookIds || []).map(id => workbooks.find(w => w.id === id)).filter(Boolean);
        return `
        <div class="student-item">
          <div class="student-info">
            <div class="student-name">${esc(s.name)}</div>
            <div class="student-meta">${esc(s.grade || '')}</div>
            <div class="chip-group">
              ${wbs.map(w => `<span class="chip">📗 ${esc(w.title)}</span>`).join('')}
              ${wbs.length === 0 ? '<span style="font-size:0.78rem;color:var(--text-sub)">배정된 문제집 없음</span>' : ''}
            </div>
          </div>
          <div class="student-actions">
            <button class="btn btn-ghost btn-sm" onclick="openEditStudentModal('${s.id}')">수정</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">삭제</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    `}
  </div>`;
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.openAddStudentModal = function() {
  const workbooks = Store.workbooks();
  openModal(`
    <div class="modal-title">👤 학생 추가</div>
    <div class="form-group">
      <label class="form-label">이름</label>
      <input id="m-name" type="text" class="form-input" placeholder="학생 이름">
    </div>
    <div class="form-group">
      <label class="form-label">학년</label>
      <input id="m-grade" type="text" class="form-input" placeholder="예: 중2, 고1">
    </div>
    <div class="form-group">
      <label class="form-label">배정 문제집</label>
      <div style="display:grid;gap:6px;margin-top:4px">
        ${workbooks.map(w => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border:1px solid var(--gray-border);border-radius:8px">
            <input type="checkbox" class="m-wb" value="${w.id}" style="width:16px;height:16px">
            <span>${esc(w.title)}</span>
          </label>
        `).join('')}
        ${workbooks.length === 0 ? '<p class="text-sub">먼저 문제집을 추가해 주세요</p>' : ''}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveNewStudent()">추가하기</button>
    </div>
  `);
};

window.saveNewStudent = function() {
  const name = document.getElementById('m-name')?.value.trim();
  const grade = document.getElementById('m-grade')?.value.trim();
  if (!name) { showToast('이름을 입력해 주세요.'); return; }
  const wbIds = [...document.querySelectorAll('.m-wb:checked')].map(el => el.value);
  const student = { id: uid(), name, grade, workbookIds: wbIds };
  const arr = Store.students();
  arr.push(student);
  Store.saveStudents(arr);
  closeModal();
  showToast(`${name} 학생이 추가되었습니다.`);
  render();
};

window.openEditStudentModal = function(sid) {
  const student = Store.students().find(s => s.id === sid);
  if (!student) return;
  const workbooks = Store.workbooks();
  openModal(`
    <div class="modal-title">✏️ 학생 수정</div>
    <div class="form-group">
      <label class="form-label">이름</label>
      <input id="m-name" type="text" class="form-input" value="${esc(student.name)}">
    </div>
    <div class="form-group">
      <label class="form-label">학년</label>
      <input id="m-grade" type="text" class="form-input" value="${esc(student.grade || '')}">
    </div>
    <div class="form-group">
      <label class="form-label">배정 문제집</label>
      <div style="display:grid;gap:6px;margin-top:4px">
        ${workbooks.map(w => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border:1px solid var(--gray-border);border-radius:8px">
            <input type="checkbox" class="m-wb" value="${w.id}" ${(student.workbookIds||[]).includes(w.id)?'checked':''} style="width:16px;height:16px">
            <span>${esc(w.title)}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveEditStudent('${sid}')">저장</button>
    </div>
  `);
};

window.saveEditStudent = function(sid) {
  const name = document.getElementById('m-name')?.value.trim();
  const grade = document.getElementById('m-grade')?.value.trim();
  if (!name) { showToast('이름을 입력해 주세요.'); return; }
  const wbIds = [...document.querySelectorAll('.m-wb:checked')].map(el => el.value);
  const arr = Store.students().map(s => s.id === sid ? {...s, name, grade, workbookIds: wbIds} : s);
  Store.saveStudents(arr);
  closeModal();
  showToast('수정되었습니다.');
  render();
};

window.deleteStudent = function(sid) {
  const s = Store.students().find(st => st.id === sid);
  if (!s) return;
  if (!confirm(`'${s.name}' 학생을 삭제할까요? 모든 진도 데이터도 함께 삭제됩니다.`)) return;
  Store.saveStudents(Store.students().filter(st => st.id !== sid));
  const prog = Store.progress();
  Object.keys(prog).forEach(k => { if (k.startsWith(sid + '__')) delete prog[k]; });
  Store.saveProgress(prog);
  Store.saveActivities(Store.activities().filter(a => a.studentId !== sid));
  showToast('삭제되었습니다.');
  render();
};

// ---------- Workbooks Tab ----------
function renderTeacherWorkbooks() {
  const workbooks = Store.workbooks();
  return `
  <div>
    <div class="section-header">
      <div class="section-title">문제집 목록 (${workbooks.length}권)</div>
      <button class="btn btn-primary btn-sm" onclick="openAddWorkbookModal()">+ 문제집 추가</button>
    </div>
    ${workbooks.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <div class="empty-title">등록된 문제집이 없습니다</div>
        <div class="empty-text">문제집을 추가해 주세요</div>
      </div>
    ` : `
    <div class="workbook-list">
      ${workbooks.map(wb => `
        <div class="workbook-item">
          <div class="workbook-header" onclick="toggleWbEdit('${wb.id}')">
            <div class="workbook-title-area">
              <span class="workbook-icon">📗</span>
              <div>
                <div class="workbook-name">${esc(wb.title)}</div>
                <div class="workbook-count">${wb.chapters.reduce((n,c)=>n+c.items.length,0)}개 항목</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openEditWorkbookModal('${wb.id}')">수정</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteWorkbook('${wb.id}')">삭제</button>
              <span class="workbook-chevron ${S.expandedWorkbooks.has(wb.id)?'open':''}">▼</span>
            </div>
          </div>
          <div class="workbook-toc ${S.expandedWorkbooks.has(wb.id)?'open':''}">
            ${wb.chapters.map(ch => `
              <div class="chapter-group">
                <div class="chapter-title">📌 ${esc(ch.title)}</div>
                ${ch.items.map(it => `<div class="toc-item"><div class="status-dot not_started"></div><span class="toc-item-title">${esc(it.title)}</span></div>`).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    `}
  </div>`;
}

window.toggleWbEdit = function(wid) {
  if (S.expandedWorkbooks.has(wid)) S.expandedWorkbooks.delete(wid);
  else S.expandedWorkbooks.add(wid);
  render();
};

window.openAddWorkbookModal = function() {
  openModal(`
    <div class="modal-title">📚 문제집 추가</div>
    <div class="form-group">
      <label class="form-label">문제집 제목</label>
      <input id="wb-title" type="text" class="form-input" placeholder="예: 수학의 정석 중2">
    </div>
    <div id="chapters-editor">
      <div class="section-header">
        <div class="form-label" style="margin:0">목차 구성</div>
        <button class="btn btn-ghost btn-sm" onclick="addChapterEditor()">+ 챕터 추가</button>
      </div>
      <div id="chapters-list"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveNewWorkbook()">추가하기</button>
    </div>
  `);
  addChapterEditor();
};

let chapterCount = 0;
window.addChapterEditor = function() {
  chapterCount++;
  const id = `ch-${Date.now()}`;
  const div = document.createElement('div');
  div.className = 'chapter-editor';
  div.id = id;
  div.innerHTML = `
    <div class="chapter-editor-header">
      <input type="text" class="form-input ch-title" placeholder="챕터 이름 (예: 1장. 유리수)" style="background:white">
      <button class="btn btn-danger btn-sm" onclick="document.getElementById('${id}').remove()">삭제</button>
    </div>
    <div class="chapter-editor-body">
      <div class="items-list-${id}"></div>
      <button class="btn btn-ghost btn-sm mt-8" onclick="addItemEditor('items-list-${id}')">+ 항목 추가</button>
    </div>
  `;
  document.getElementById('chapters-list').appendChild(div);
  addItemEditor(`items-list-${id}`);
};

window.addItemEditor = function(listId) {
  const list = document.getElementById(listId);
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="text" class="form-input item-title" placeholder="항목 이름 (예: 1-1. 유리수의 뜻)">
    <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(row);
};

window.saveNewWorkbook = function() {
  const title = document.getElementById('wb-title')?.value.trim();
  if (!title) { showToast('문제집 제목을 입력해 주세요.'); return; }

  const chapters = [];
  document.querySelectorAll('.chapter-editor').forEach(chEl => {
    const chTitle = chEl.querySelector('.ch-title')?.value.trim();
    if (!chTitle) return;
    const items = [];
    chEl.querySelectorAll('.item-title').forEach(inp => {
      const t = inp.value.trim();
      if (t) items.push({ id: uid(), title: t });
    });
    if (items.length > 0) chapters.push({ id: uid(), title: chTitle, items });
  });

  if (chapters.length === 0) { showToast('최소 1개의 챕터와 항목을 추가해 주세요.'); return; }
  const wb = { id: uid(), title, chapters };
  const arr = Store.workbooks();
  arr.push(wb);
  Store.saveWorkbooks(arr);
  closeModal();
  showToast(`'${title}' 문제집이 추가되었습니다.`);
  render();
};

window.openEditWorkbookModal = function(wid) {
  const wb = Store.workbooks().find(w => w.id === wid);
  if (!wb) return;
  openModal(`
    <div class="modal-title">✏️ 문제집 수정: ${esc(wb.title)}</div>
    <div class="form-group">
      <label class="form-label">문제집 제목</label>
      <input id="wb-title" type="text" class="form-input" value="${esc(wb.title)}">
    </div>
    <div id="chapters-editor">
      <div class="section-header">
        <div class="form-label" style="margin:0">목차 구성</div>
        <button class="btn btn-ghost btn-sm" onclick="addChapterEditor()">+ 챕터 추가</button>
      </div>
      <div id="chapters-list">
        ${wb.chapters.map(ch => `
          <div class="chapter-editor" id="ch-${ch.id}">
            <div class="chapter-editor-header">
              <input type="text" class="form-input ch-title" value="${esc(ch.title)}" style="background:white">
              <button class="btn btn-danger btn-sm" onclick="document.getElementById('ch-${ch.id}').remove()">삭제</button>
            </div>
            <div class="chapter-editor-body">
              <div class="items-list-ch-${ch.id}">
                ${ch.items.map(it => `
                  <div class="item-row">
                    <input type="text" class="form-input item-title" value="${esc(it.title)}">
                    <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>
                  </div>
                `).join('')}
              </div>
              <button class="btn btn-ghost btn-sm mt-8" onclick="addItemEditor('items-list-ch-${ch.id}')">+ 항목 추가</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveEditWorkbook('${wid}')">저장</button>
    </div>
  `);
};

window.saveEditWorkbook = function(wid) {
  const title = document.getElementById('wb-title')?.value.trim();
  if (!title) { showToast('문제집 제목을 입력해 주세요.'); return; }
  const chapters = [];
  document.querySelectorAll('.chapter-editor').forEach(chEl => {
    const chTitle = chEl.querySelector('.ch-title')?.value.trim();
    if (!chTitle) return;
    const items = [];
    chEl.querySelectorAll('.item-title').forEach(inp => {
      const t = inp.value.trim();
      if (t) items.push({ id: uid(), title: t });
    });
    if (items.length > 0) chapters.push({ id: uid(), title: chTitle, items });
  });
  if (chapters.length === 0) { showToast('최소 1개의 챕터와 항목을 추가해 주세요.'); return; }
  const arr = Store.workbooks().map(w => w.id === wid ? { ...w, title, chapters } : w);
  Store.saveWorkbooks(arr);
  closeModal();
  showToast('문제집이 수정되었습니다.');
  render();
};

window.deleteWorkbook = function(wid) {
  const wb = Store.workbooks().find(w => w.id === wid);
  if (!wb) return;
  if (!confirm(`'${wb.title}'을 삭제할까요?`)) return;
  Store.saveWorkbooks(Store.workbooks().filter(w => w.id !== wid));
  const students = Store.students().map(s => ({...s, workbookIds: (s.workbookIds||[]).filter(id => id !== wid)}));
  Store.saveStudents(students);
  showToast('삭제되었습니다.');
  render();
};

// ---------- Progress Tab ----------
function renderTeacherProgress() {
  const students = Store.students();
  const workbooks = Store.workbooks();
  const sid = S.teacherProgStudent;
  const wid = S.teacherProgWorkbook;

  if (students.length === 0) return `<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">학생을 먼저 등록해 주세요</div></div>`;

  const selectedStudent = students.find(s => s.id === sid);
  const studentWorkbooks = selectedStudent ? (selectedStudent.workbookIds || []).map(id => workbooks.find(w => w.id === id)).filter(Boolean) : [];
  const selectedWorkbook = studentWorkbooks.find(w => w.id === wid);

  return `
  <div>
    <div class="mb-16">
      <div class="form-label mb-8">학생 선택</div>
      <div class="progress-student-select">
        ${students.map(s => `
          <div class="progress-student-card ${sid === s.id ? 'selected' : ''}" onclick="selectProgStudent('${s.id}')">
            <div style="font-size:2rem">👤</div>
            <div class="name">${esc(s.name)}</div>
            <div class="grade">${esc(s.grade || '')}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${selectedStudent && studentWorkbooks.length === 0 ? `
      <div class="card" style="text-align:center;color:var(--text-sub);padding:24px">
        배정된 문제집이 없습니다. 학생 관리에서 문제집을 배정해 주세요.
      </div>
    ` : ''}

    ${selectedStudent && studentWorkbooks.length > 0 ? `
      <div class="mb-16">
        <div class="form-label mb-8">문제집 선택</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${studentWorkbooks.map(w => `
            <button class="btn ${wid === w.id ? 'btn-primary' : 'btn-ghost'}" onclick="selectProgWorkbook('${w.id}')">
              📗 ${esc(w.title)}
            </button>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${selectedWorkbook ? renderProgressEditor(sid, selectedWorkbook) : ''}

    ${!selectedStudent ? `
      <div class="empty-state">
        <div class="empty-icon">☝️</div>
        <div class="empty-title">학생을 선택해 주세요</div>
      </div>
    ` : ''}
  </div>`;
}

function renderProgressEditor(sid, wb) {
  const prog = Store.getStudentProgress(sid, wb.id);
  const { total, completed, in_progress, pct } = calcProgress(sid, wb.id, wb);
  return `
  <div class="card">
    <div class="card-title">📊 ${esc(wb.title)} 진도 관리</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <span style="font-weight:700;color:var(--primary);min-width:40px">${pct}%</span>
    </div>
    <div class="progress-stats mb-16">
      <div class="stat"><div class="stat-dot" style="background:var(--success)"></div>${completed} 완료</div>
      <div class="stat"><div class="stat-dot" style="background:var(--warning)"></div>${in_progress} 진행중</div>
      <div class="stat"><div class="stat-dot" style="background:#D1D5DB"></div>${total - completed - in_progress} 미진행</div>
    </div>
    ${wb.chapters.map(ch => `
      <div class="chapter-group">
        <div class="chapter-title">📌 ${esc(ch.title)}</div>
        ${ch.items.map(it => {
          const status = prog[it.id] || 'not_started';
          return `
          <div class="status-select-row">
            <div class="status-dot ${status}"></div>
            <span style="flex:1;font-size:0.88rem">${esc(it.title)}</span>
            <div class="status-btn-group">
              <button class="status-btn completed ${status==='completed'?'active':''}" onclick="setItemStatus('${sid}','${wb.id}','${it.id}','completed')">완료</button>
              <button class="status-btn in_progress ${status==='in_progress'?'active':''}" onclick="setItemStatus('${sid}','${wb.id}','${it.id}','in_progress')">진행중</button>
              <button class="status-btn not_started ${status==='not_started'?'active':''}" onclick="setItemStatus('${sid}','${wb.id}','${it.id}','not_started')">미진행</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `).join('')}
  </div>`;
}

window.selectProgStudent = function(sid) { S.teacherProgStudent = sid; S.teacherProgWorkbook = null; render(); };
window.selectProgWorkbook = function(wid) { S.teacherProgWorkbook = wid; render(); };
window.setItemStatus = function(sid, wid, itemId, status) {
  Store.setItemStatus(sid, wid, itemId, status);
  render();
};

// ---------- Photos Tab ----------
function renderTeacherPhotos() {
  const students = Store.students();
  const sid = S.teacherPhotoStudent;
  const date = S.teacherPhotoDate || todayStr();
  const selectedStudent = students.find(s => s.id === sid);
  const activity = sid ? Store.getDateActivities(sid, date) : null;
  const photos = activity ? activity.photos : [];

  return `
  <div>
    <div class="mb-16">
      <div class="form-label mb-8">학생 선택</div>
      <div class="progress-student-select">
        ${students.map(s => `
          <div class="progress-student-card ${sid === s.id ? 'selected' : ''}" onclick="selectPhotoStudent('${s.id}')">
            <div style="font-size:2rem">👤</div>
            <div class="name">${esc(s.name)}</div>
            <div class="grade">${esc(s.grade || '')}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${selectedStudent ? `
      <div class="mb-16">
        <div class="form-label mb-8">날짜 선택</div>
        <input type="date" class="form-input" style="max-width:220px" value="${date}" onchange="setPhotoDate(this.value)">
      </div>

      <div class="photo-date-banner">
        <span style="font-size:1.5rem">📷</span>
        <div>
          <div class="date-label">${esc(selectedStudent.name)} · ${formatDate(date)} (${getDayOfWeek(date)})</div>
          <div class="date-sub">사진 ${photos.length}장</div>
        </div>
      </div>

      <label class="photo-upload-area" style="display:block;cursor:pointer">
        <input type="file" accept="image/*" multiple onchange="handlePhotoUpload(event, '${sid}', '${date}')">
        <div class="photo-upload-icon">📤</div>
        <div class="photo-upload-text">사진 업로드</div>
        <div class="photo-upload-sub">클릭하거나 파일을 드래그하세요 (여러 장 가능)</div>
      </label>

      ${photos.length > 0 ? `
        <div class="mt-16">
          <div class="section-header">
            <div class="section-title">업로드된 사진 (${photos.length}장)</div>
          </div>
          <div class="photo-grid">
            ${photos.map((p, i) => `
              <div class="photo-item">
                <img src="${p}" alt="학습 사진" onclick="openLightbox('${sid}','${date}',${i})">
                <button class="photo-delete" onclick="deletePhoto('${sid}','${date}',${i})">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `<div class="empty-state" style="padding:24px"><div class="empty-icon">📷</div><div class="empty-title">업로드된 사진이 없습니다</div></div>`}
    ` : `
      <div class="empty-state">
        <div class="empty-icon">☝️</div>
        <div class="empty-title">학생을 선택해 주세요</div>
      </div>
    `}
  </div>`;
}

window.selectPhotoStudent = function(sid) { S.teacherPhotoStudent = sid; render(); };
window.setPhotoDate = function(date) { S.teacherPhotoDate = date; render(); };

window.handlePhotoUpload = async function(event, sid, date) {
  const files = [...event.target.files];
  if (files.length === 0) return;
  showToast('사진을 처리 중입니다...');
  for (const file of files) {
    try {
      const dataUrl = await compressImage(file);
      const ok = Store.addPhoto(sid, date, dataUrl);
      if (!ok) break;
    } catch(e) {
      showToast('사진 처리 중 오류가 발생했습니다.');
    }
  }
  showToast(`${files.length}장의 사진이 업로드되었습니다.`);
  render();
};

window.deletePhoto = function(sid, date, idx) {
  if (!confirm('이 사진을 삭제할까요?')) return;
  Store.removePhoto(sid, date, idx);
  showToast('삭제되었습니다.');
  render();
};

// ================================================================
//  FULLSCREEN LIGHTBOX
// ================================================================
const LB = { photos: [], idx: 0 };

function buildLightbox() {
  const el = document.getElementById('lightbox');
  el.innerHTML = `
    <button class="lb-close" onclick="closeLightbox()">✕</button>
    <div class="lb-counter" id="lb-counter"></div>
    <div class="lb-stage">
      <button class="lb-arrow lb-prev" id="lb-prev" onclick="lbNav(-1)">‹</button>
      <div class="lb-img-wrap" id="lb-img-wrap">
        <img id="lb-img" src="" alt="" class="lb-img" ondblclick="lbToggleZoom(this)">
      </div>
      <button class="lb-arrow lb-next" id="lb-next" onclick="lbNav(1)">›</button>
    </div>
    <div class="lb-thumbs" id="lb-thumbs"></div>
  `;
}

function lbRender() {
  const { photos, idx } = LB;
  const img = document.getElementById('lb-img');
  const counter = document.getElementById('lb-counter');
  const prev = document.getElementById('lb-prev');
  const next = document.getElementById('lb-next');
  const thumbs = document.getElementById('lb-thumbs');

  img.src = photos[idx];
  img.style.transform = 'scale(1)';
  counter.textContent = `${idx + 1} / ${photos.length}`;
  prev.style.opacity = idx > 0 ? '1' : '0.25';
  prev.style.pointerEvents = idx > 0 ? 'auto' : 'none';
  next.style.opacity = idx < photos.length - 1 ? '1' : '0.25';
  next.style.pointerEvents = idx < photos.length - 1 ? 'auto' : 'none';

  if (photos.length > 1) {
    thumbs.style.display = 'flex';
    thumbs.innerHTML = photos.map((p, i) => `
      <div class="lb-thumb ${i === idx ? 'lb-thumb-active' : ''}" onclick="lbGoTo(${i})">
        <img src="${p}" alt="">
      </div>`).join('');
    // scroll active thumb into view
    requestAnimationFrame(() => {
      thumbs.querySelector('.lb-thumb-active')?.scrollIntoView({ inline: 'center', behavior: 'smooth' });
    });
  } else {
    thumbs.style.display = 'none';
  }
}

window.lbNav = function(delta) {
  const newIdx = LB.idx + delta;
  if (newIdx < 0 || newIdx >= LB.photos.length) return;
  const wrap = document.getElementById('lb-img-wrap');
  wrap.classList.add(delta > 0 ? 'lb-slide-left' : 'lb-slide-right');
  setTimeout(() => {
    LB.idx = newIdx;
    wrap.classList.remove('lb-slide-left', 'lb-slide-right');
    wrap.classList.add('lb-slide-in');
    lbRender();
    setTimeout(() => wrap.classList.remove('lb-slide-in'), 200);
  }, 160);
};

window.lbGoTo = function(idx) {
  if (idx === LB.idx) return;
  const delta = idx > LB.idx ? 1 : -1;
  LB.idx = idx;
  const wrap = document.getElementById('lb-img-wrap');
  wrap.classList.add(delta > 0 ? 'lb-slide-left' : 'lb-slide-right');
  setTimeout(() => {
    wrap.classList.remove('lb-slide-left', 'lb-slide-right');
    wrap.classList.add('lb-slide-in');
    lbRender();
    setTimeout(() => wrap.classList.remove('lb-slide-in'), 200);
  }, 160);
};

window.lbToggleZoom = function(img) {
  img.style.transform = img.style.transform === 'scale(2)' ? 'scale(1)' : 'scale(2)';
  img.style.cursor = img.style.transform === 'scale(2)' ? 'zoom-out' : 'zoom-in';
};

window.openLightbox = function(sid, date, idx) {
  const activity = Store.getDateActivities(sid, date);
  if (!activity) return;
  LB.photos = activity.photos;
  LB.idx = idx;
  buildLightbox();
  lbRender();
  const el = document.getElementById('lightbox');
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setupLbSwipe();
  setupLbKeyboard();
};

window.closeLightbox = function() {
  document.getElementById('lightbox').classList.add('hidden');
  document.body.style.overflow = '';
};

function setupLbSwipe() {
  const wrap = document.getElementById('lb-img-wrap');
  let sx = 0, sy = 0;
  wrap.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) lbNav(dx < 0 ? 1 : -1);
  }, { passive: true });
}

function setupLbKeyboard() {
  const handler = (e) => {
    if (document.getElementById('lightbox').classList.contains('hidden')) {
      document.removeEventListener('keydown', handler);
      return;
    }
    if (e.key === 'ArrowRight') lbNav(1);
    if (e.key === 'ArrowLeft')  lbNav(-1);
    if (e.key === 'Escape')     closeLightbox();
  };
  document.removeEventListener('keydown', handler);
  document.addEventListener('keydown', handler);
}

document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});

// ================================================================
//  PARENT VIEW
// ================================================================
function renderParent() {
  const student = Store.students().find(s => s.id === S.parentStudentId);
  if (!student) { nav('parent-login'); return ''; }
  return `
  <div>
    <div class="header">
      <div class="header-left">
        <span class="header-logo">📐</span>
        <div>
          <div class="header-title">${esc(student.name)} 학생</div>
          <div class="header-subtitle">${esc(student.grade || '')} 학습 현황</div>
        </div>
      </div>
      <button class="btn-back" onclick="nav('parent-login')">← 나가기</button>
    </div>
    <div class="tabs">
      <button class="tab-btn ${S.parentTab==='progress'?'active':''}" onclick="setParentTab('progress')">📊 진도현황</button>
      <button class="tab-btn ${S.parentTab==='calendar'?'active':''}" onclick="setParentTab('calendar')">📅 학습달력</button>
    </div>
    <div class="content">
      ${S.parentTab === 'progress' ? renderParentProgress(student) : renderParentCalendar(student)}
    </div>
  </div>`;
}

window.setParentTab = function(tab) { S.parentTab = tab; render(); };

// ---------- Parent Progress ----------
function renderParentProgress(student) {
  const workbooks = Store.workbooks();
  const studentWorkbooks = (student.workbookIds || []).map(id => workbooks.find(w => w.id === id)).filter(Boolean);

  if (studentWorkbooks.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">배정된 문제집이 없습니다</div><div class="empty-text">선생님께 문의해 주세요</div></div>`;
  }

  return `
  <div>
    <p class="text-sub mb-16">📘 문제집을 클릭하면 세부 진도를 확인할 수 있어요</p>
    <div class="workbook-list">
      ${studentWorkbooks.map(wb => {
        const { total, completed, in_progress, pct } = calcProgress(student.id, wb.id, wb);
        const prog = Store.getStudentProgress(student.id, wb.id);
        const isOpen = S.expandedWorkbooks.has(wb.id + '_parent');
        return `
        <div class="workbook-item">
          <div class="workbook-header" onclick="toggleParentWb('${wb.id}')">
            <div class="workbook-title-area">
              <span class="workbook-icon">📗</span>
              <div>
                <div class="workbook-name">${esc(wb.title)}</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
                  <div class="progress-bar-wrap" style="width:120px;height:6px">
                    <div class="progress-bar-fill" style="width:${pct}%"></div>
                  </div>
                  <span style="font-size:0.82rem;font-weight:700;color:var(--primary)">${pct}%</span>
                </div>
                <div class="progress-stats mt-8">
                  <div class="stat"><div class="stat-dot" style="background:var(--success)"></div>${completed} 완료</div>
                  <div class="stat"><div class="stat-dot" style="background:var(--warning)"></div>${in_progress} 진행중</div>
                  <div class="stat"><div class="stat-dot" style="background:#D1D5DB"></div>${total - completed - in_progress} 미진행</div>
                </div>
              </div>
            </div>
            <span class="workbook-chevron ${isOpen?'open':''}">▼</span>
          </div>
          <div class="workbook-toc ${isOpen?'open':''}">
            ${wb.chapters.map(ch => `
              <div class="chapter-group">
                <div class="chapter-title">📌 ${esc(ch.title)}</div>
                ${ch.items.map(it => {
                  const s = prog[it.id] || 'not_started';
                  return `
                  <div class="toc-item">
                    <div class="status-dot ${s}"></div>
                    <span class="toc-item-title">${esc(it.title)}</span>
                    <span class="toc-item-badge badge-${s}">${statusLabel(s)}</span>
                  </div>`;
                }).join('')}
              </div>
            `).join('')}
            <div style="display:flex;gap:16px;padding:12px 10px 0;font-size:0.8rem">
              <div style="display:flex;align-items:center;gap:6px"><div class="status-dot completed"></div> 진행완료</div>
              <div style="display:flex;align-items:center;gap:6px"><div class="status-dot in_progress"></div> 진행중</div>
              <div style="display:flex;align-items:center;gap:6px"><div class="status-dot not_started"></div> 아직 안 품</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

window.toggleParentWb = function(wid) {
  const key = wid + '_parent';
  if (S.expandedWorkbooks.has(key)) S.expandedWorkbooks.delete(key);
  else S.expandedWorkbooks.add(key);
  render();
};

// ---------- Parent Calendar ----------
function renderParentCalendar(student) {
  const { year, month } = S.cal;
  const counts = Store.getActivityCounts(student.id);
  const today = todayStr();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}-`;
  const activeDaysThisMonth = Object.keys(counts).filter(d => d.startsWith(monthPrefix)).sort();

  let cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthPrefix}${String(d).padStart(2,'0')}`;
    cells.push({ d, dateStr, count: counts[dateStr] || 0, isToday: dateStr === today });
  }

  const selectedActivity = S.selectedDate ? Store.getDateActivities(student.id, S.selectedDate) : null;
  const selectedPhotos = selectedActivity ? selectedActivity.photos : [];

  // photo grid layout class
  const gridClass = selectedPhotos.length === 1 ? 'single'
    : selectedPhotos.length === 3 ? 'triple' : '';

  setTimeout(setupCalendarSwipe, 0);

  return `
  <div id="calendar-root">
    <div class="cal-card" id="cal-swipe-area">
      <div class="cal-header">
        <button class="cal-nav-btn" onclick="prevMonth()">‹</button>
        <div class="cal-header-center">
          <div class="cal-month-name">${monthNames[month]}</div>
          <div class="cal-year-label">${year}년</div>
        </div>
        <button class="cal-nav-btn" onclick="nextMonth()">›</button>
      </div>

      <div class="cal-grid">
        ${['일','월','화','수','목','금','토'].map((h,i) =>
          `<div class="cal-day-hdr ${i===0?'sun':i===6?'sat':''}">${h}</div>`
        ).join('')}
        ${cells.map(cell => {
          if (!cell) return `<div></div>`;
          const isSelected = S.selectedDate === cell.dateStr;
          const dow = new Date(cell.dateStr).getDay();
          const hasActivity = cell.count > 0;
          let cls = 'cal-cell';
          if (isSelected)       cls += ' cal-selected';
          else if (hasActivity) cls += ' cal-has-activity';
          if (!isSelected && dow === 0) cls += ' cal-sun';
          if (!isSelected && dow === 6) cls += ' cal-sat';
          return `
          <div class="${cls}" onclick="selectDate('${cell.dateStr}')">
            <span class="cal-num ${cell.isToday && !isSelected ? 'cal-today-num' : ''}">${cell.d}</span>
            ${hasActivity ? `<span class="cal-photo-badge ${isSelected ? 'cal-photo-badge-inv' : ''}">${cell.count}</span>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="cal-legend">
      <div class="cal-legend-item"><div class="cal-legend-box"></div>수업한 날</div>
      <div class="cal-legend-item"><div class="cal-legend-today"></div>오늘</div>
      <div class="cal-legend-item"><span class="cal-legend-badge">2</span>사진 수</div>
    </div>

    ${S.selectedDate ? `
      <div class="cal-photo-panel ${selectedPhotos.length > 0 ? 'has-photos' : ''}" id="cal-photo-panel">
        <div class="cal-panel-header">
          <div>
            <div class="cal-panel-date">${formatDate(S.selectedDate)} <span class="cal-panel-dow">${getDayOfWeek(S.selectedDate)}요일</span></div>
            <div class="cal-panel-meta">${selectedPhotos.length > 0 ? `📷 사진 ${selectedPhotos.length}장` : '학습 사진이 없어요'}</div>
          </div>
          <button class="cal-close-btn" onclick="selectDate('${S.selectedDate}')">✕</button>
        </div>
        ${selectedPhotos.length > 0 ? `
          <div class="cal-photo-grid ${gridClass}">
            ${selectedPhotos.map((p, i) => `
              <div class="cal-photo-thumb" onclick="openLightboxParent(${i})">
                <img src="${p}" alt="사진 ${i+1}" loading="lazy">
                <div class="cal-photo-overlay"><span class="lb-zoom-icon">⊕</span></div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="cal-no-photo">
            <div style="font-size:2.5rem;margin-bottom:8px">📭</div>
            <div>선생님이 아직 사진을 올리지 않았어요</div>
          </div>
        `}
      </div>
    ` : `
      <div class="cal-hint-panel">
        <div class="cal-empty-hint">
          <div class="hint-icon">👆</div>
          <div class="hint-main">날짜를 탭하면 학습 사진을 볼 수 있어요</div>
          <div class="hint-sub">숫자 배지가 있는 날은 사진이 올라와 있어요</div>
        </div>
      </div>
    `}
  </div>`;
}

window.prevMonth = function() {
  let { year, month } = S.cal;
  month--; if (month < 0) { month = 11; year--; }
  S.cal = { year, month }; S.selectedDate = null; render();
};
window.nextMonth = function() {
  let { year, month } = S.cal;
  month++; if (month > 11) { month = 0; year++; }
  S.cal = { year, month }; S.selectedDate = null; render();
};
window.selectDate = function(date) {
  S.selectedDate = S.selectedDate === date ? null : date;
  render();
  if (S.selectedDate) {
    requestAnimationFrame(() => {
      document.getElementById('cal-photo-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
};

function setupCalendarSwipe() {
  const el = document.getElementById('cal-swipe-area');
  if (!el || el._swipeReady) return;
  el._swipeReady = true;
  let startX = 0, startY = 0;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      dx < 0 ? nextMonth() : prevMonth();
    }
  }, { passive: true });
}

window.openLightboxParent = function(idx) {
  if (!S.selectedDate || !S.parentStudentId) return;
  openLightbox(S.parentStudentId, S.selectedDate, idx);
};

// ================================================================
//  INIT
// ================================================================
initDemo();
render();

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', closeModal);
