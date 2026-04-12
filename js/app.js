// ============================================================
// 추풍령교회 · 구름바람 작은도서관 - Main App JS
// Firebase Modular SDK v10
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc,
  query, orderBy, limit, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ============================================================
// ⚠️  FIREBASE 설정
// Firebase 콘솔(https://console.firebase.google.com)에서
// 프로젝트를 생성한 후, 아래 값을 실제 설정으로 교체하세요.
// ============================================================
const firebaseConfig = {
  apiKey:            "AIzaSyBQRhS0KaxPbATQiiFUxzKcHItGeKNcRBQ",
  authDomain:        "chupungnyeong-church.firebaseapp.com",
  projectId:         "chupungnyeong-church",
  storageBucket:     "chupungnyeong-church.firebasestorage.app",
  messagingSenderId: "755175893815",
  appId:             "1:755175893815:web:60ff685cbfa95e9f5948b2",
  measurementId:     "G-CG7BB1FD0Y"
};

// Firebase 초기화 (설정 미완료 시 데모 데이터 사용)
let db = null, storage = null;
let firebaseReady = false;

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    firebaseReady = true;
    console.log("✅ Firebase 연결됨");
  } else {
    console.info("ℹ️  Firebase 미설정. 데모 데이터로 표시합니다.");
  }
} catch (e) {
  console.warn("Firebase 초기화 오류:", e.message);
}

// ============================================================
// 데모 데이터 (Firebase 미설정 시 표시)
// ============================================================
const DEMO_NOTICES = [
  {
    id: "n1", title: "2025년 하계 성경학교 안내",
    category: "church", date: new Date("2025-07-01"),
    content: "7월 28일(월)부터 8월 1일(금)까지 여름 성경학교를 진행합니다.\n대상: 초등학생 이하 어린이\n장소: 추풍령교회 본당\n등록 문의: 담임목사 연락처로 문의해 주세요."
  },
  {
    id: "n2", title: "구름빵 독서교실 2학기 모집",
    category: "library", date: new Date("2025-06-20"),
    content: "9월부터 시작하는 구름빵 독서교실 2학기 참여 어린이를 모집합니다.\n대상: 7~13세 어린이\n매주 토요일 오전 10:00~12:00\n선착순 15명 모집"
  },
  {
    id: "n3", title: "광장기도회 안내",
    category: "church", date: new Date("2025-06-10"),
    content: "매월 마지막 주 토요일 오전 6시, 추풍령 광장에서 기도회를 드립니다.\n나라와 민족, 지역사회를 위해 함께 기도합시다."
  },
  {
    id: "n4", title: "풋살·체육 프로그램 참여자 모집",
    category: "event", date: new Date("2025-06-05"),
    content: "김천 아이원스포츠와 연계한 풋살 및 체육활동 프로그램 참여자를 모집합니다.\n월 1회 운영 (총 7회기)\n전문 강사 지도 아래 진행됩니다."
  },
  {
    id: "n5", title: "6월 도서관 특별 프로그램 안내",
    category: "library", date: new Date("2025-05-28"),
    content: "6월 한 달간 마을 기록 아카이빙 특별 프로그램이 진행됩니다.\n지역 어르신들의 기억과 이야기를 함께 기록해요."
  },
];

const DEMO_SERMONS = [
  { id: "s1", title: "하나님의 은혜는 족하도다", preacher: "김철홍 목사", date: new Date("2025-06-29"), youtubeId: "dQw4w9WgXcQ", scripture: "고린도후서 12:9" },
  { id: "s2", title: "믿음으로 행하라",           preacher: "김철홍 목사", date: new Date("2025-06-22"), youtubeId: "dQw4w9WgXcQ", scripture: "히브리서 11:1-6" },
  { id: "s3", title: "복음의 능력",               preacher: "김철홍 목사", date: new Date("2025-06-15"), youtubeId: "dQw4w9WgXcQ", scripture: "로마서 1:16-17" },
  { id: "s4", title: "기도하는 교회",             preacher: "김철홍 목사", date: new Date("2025-06-08"), youtubeId: "dQw4w9WgXcQ", scripture: "마태복음 21:13" },
  { id: "s5", title: "한 영혼을 소중히",          preacher: "김철홍 목사", date: new Date("2025-06-01"), youtubeId: "dQw4w9WgXcQ", scripture: "누가복음 15:1-7" },
  { id: "s6", title: "지역을 품는 교회",          preacher: "김철홍 목사", date: new Date("2025-05-25"), youtubeId: "dQw4w9WgXcQ", scripture: "예레미야 29:7" },
];

const DEMO_GALLERY = [
  { id: "g1", title: "구름빵 독서교실",       url: "https://picsum.photos/seed/chup1/600/600",  category: "library", date: new Date() },
  { id: "g2", title: "온세대 합창 연습",      url: "https://picsum.photos/seed/chup2/600/600",  category: "library", date: new Date() },
  { id: "g3", title: "문해교실",             url: "https://picsum.photos/seed/chup3/600/600",  category: "library", date: new Date() },
  { id: "g4", title: "원예 힐링 프로그램",    url: "https://picsum.photos/seed/chup4/600/600",  category: "library", date: new Date() },
  { id: "g5", title: "마을기록 아카이빙",     url: "https://picsum.photos/seed/chup5/600/600",  category: "library", date: new Date() },
  { id: "g6", title: "가을바람 음악회",       url: "https://picsum.photos/seed/chup6/600/600",  category: "event",   date: new Date() },
  { id: "g7", title: "공예 활동",            url: "https://picsum.photos/seed/chup7/600/600",  category: "library", date: new Date() },
  { id: "g8", title: "주일예배",             url: "https://picsum.photos/seed/chup8/600/600",  category: "church",  date: new Date() },
  { id: "g9", title: "다음세대 캠프",         url: "https://picsum.photos/seed/chup9/600/600",  category: "church",  date: new Date() },
  { id: "g10", title: "지역 연합 행사",       url: "https://picsum.photos/seed/chup10/600/600", category: "event",   date: new Date() },
  { id: "g11", title: "악기 수업",           url: "https://picsum.photos/seed/chup11/600/600", category: "library", date: new Date() },
  { id: "g12", title: "요리 활동",           url: "https://picsum.photos/seed/chup12/600/600", category: "library", date: new Date() },
];

// ============================================================
// 유틸리티
// ============================================================
function formatDate(raw) {
  if (!raw) return "";
  let d;
  if (raw instanceof Date)          d = raw;
  else if (raw?.toDate)             d = raw.toDate();       // Firestore Timestamp
  else if (typeof raw === "string") d = new Date(raw);
  else return "";
  if (isNaN(d)) return "";
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

function getYTThumb(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function extractYTId(url = "") {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}

function resolveVideoId(sermon) {
  return sermon.youtubeId || extractYTId(sermon.youtubeUrl) || "dQw4w9WgXcQ";
}

// ============================================================
// 렌더 함수
// ============================================================

/** 홈 공지 3개 */
function renderNoticesGrid(notices) {
  const el = document.getElementById("noticesGrid");
  if (!el) return;
  const catLabel = { church: "⛪ 교회", library: "📚 도서관", event: "📅 행사" };
  el.innerHTML = notices.slice(0, 3).map(n => `
    <div class="notice-card cat-${n.category}" onclick="openNotice(${JSON.stringify(n).replace(/"/g,'&quot;')})">
      <div class="nc-cat ${n.category === "library" ? "library" : ""}">${catLabel[n.category] || "교회"}</div>
      <div class="nc-title">${n.title}</div>
      <div class="nc-date">${formatDate(n.date)}</div>
    </div>
  `).join("");
}

/** 전체 공지 목록 */
let allNotices = [];
function renderNoticesList(filter = "all") {
  const el = document.getElementById("noticesFullList");
  if (!el) return;
  const catLabel = { church: "⛪ 교회", library: "📚 도서관", event: "📅 행사" };
  const list = filter === "all" ? allNotices : allNotices.filter(n => n.category === filter);
  if (list.length === 0) {
    el.innerHTML = `<p class="loading-text">등록된 공지사항이 없습니다.</p>`;
    return;
  }
  el.innerHTML = list.map(n => `
    <div class="notice-row cat-${n.category}" onclick="openNotice(${JSON.stringify(n).replace(/"/g,'&quot;')})">
      <div class="nr-left">
        <div class="nr-cat ${n.category}">${catLabel[n.category] || "교회"}</div>
        <div class="nr-title">${n.title}</div>
      </div>
      <div class="nr-date">${formatDate(n.date)}</div>
    </div>
  `).join("");
}

/** 홈 설교 카드 3개 */
function renderSermonsGrid(sermons) {
  const el = document.getElementById("sermonsGridHome");
  if (!el) return;
  el.innerHTML = sermons.slice(0, 3).map(s => {
    const vid = resolveVideoId(s);
    return `
    <div class="sermon-card">
      <a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener">
        <div class="sermon-thumb">
          <img src="${getYTThumb(vid)}" alt="${s.title}" loading="lazy">
          <div class="sermon-play-btn"><div class="play-circle">▶</div></div>
        </div>
      </a>
      <div class="sermon-body">
        <div class="sermon-title">${s.title}</div>
        <div class="sermon-meta">${s.scripture || ""}${s.scripture ? " · " : ""}${formatDate(s.date)}</div>
      </div>
    </div>`;
  }).join("");
}

/** 전체 설교 목록 */
function renderSermonsList(sermons) {
  const el = document.getElementById("sermonsListFull");
  if (!el) return;
  if (sermons.length === 0) {
    el.innerHTML = `<p class="loading-text">등록된 설교가 없습니다.</p>`;
    return;
  }
  el.innerHTML = sermons.map(s => {
    const vid = resolveVideoId(s);
    return `
    <div class="sermon-row">
      <span class="sr-date">${formatDate(s.date)}</span>
      <span class="sr-title">${s.title}</span>
      <span class="sr-scripture">${s.scripture || ""}</span>
      <a class="sr-link" href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener">▶ 시청하기</a>
    </div>`;
  }).join("");
}

/** 갤러리 */
let allGallery = [];
let galleryPage = 0;
const GALLERY_PER_PAGE = 12;

function renderGallery(photos, append = false) {
  const el = document.getElementById("galleryGrid");
  if (!el) return;
  if (!append) el.innerHTML = "";
  if (photos.length === 0 && !append) {
    el.innerHTML = `<p class="loading-text" style="grid-column:1/-1">등록된 사진이 없습니다.</p>`;
    return;
  }
  el.insertAdjacentHTML("beforeend", photos.map(p => `
    <div class="gallery-item" onclick="openImgModal('${p.url}','${p.title.replace(/'/g, "\\'")}')">
      <img src="${p.url}" alt="${p.title}" loading="lazy">
      <div class="gallery-overlay">
        <span class="gallery-overlay-text">${p.title}</span>
      </div>
    </div>
  `).join(""));
}

// ============================================================
// 모달
// ============================================================

/** 이미지 모달 */
window.openImgModal = function(url, caption) {
  const modal = document.getElementById("imgModal");
  document.getElementById("imgModalSrc").src = url;
  document.getElementById("imgModalCaption").textContent = caption;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
};

function closeImgModal() {
  document.getElementById("imgModal")?.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("imgModalClose")?.addEventListener("click", closeImgModal);
document.getElementById("imgModalBg")?.addEventListener("click", closeImgModal);

/** 공지 상세 모달 */
window.openNotice = function(notice) {
  if (typeof notice === "string") {
    try { notice = JSON.parse(notice); } catch { return; }
  }
  const catLabel = { church: "⛪ 교회", library: "📚 도서관", event: "📅 행사" };
  const content = document.getElementById("noticeModalContent");
  content.innerHTML = `
    <div class="notice-modal-cat">${catLabel[notice.category] || "교회"}</div>
    <div class="notice-modal-title">${notice.title}</div>
    <div class="notice-modal-date">${formatDate(notice.date)}</div>
    <div class="notice-modal-body">${notice.content || "내용이 없습니다."}</div>
  `;
  document.getElementById("noticeModal")?.classList.add("open");
  document.body.style.overflow = "hidden";
};

function closeNoticeModal() {
  document.getElementById("noticeModal")?.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("noticeModalClose")?.addEventListener("click", closeNoticeModal);
document.getElementById("noticeModalBg")?.addEventListener("click", closeNoticeModal);

// ESC 키로 모달 닫기
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeImgModal(); closeNoticeModal(); }
});

// ============================================================
// 네비게이션
// ============================================================
const navToggle = document.getElementById("navToggle");
const navMenu   = document.getElementById("navMenu");

navToggle?.addEventListener("click", () => {
  navMenu.classList.toggle("open");
  const open = navMenu.classList.contains("open");
  navToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  navToggle.querySelectorAll("span")[0].style.transform = open ? "rotate(45deg) translate(5px, 5px)"  : "";
  navToggle.querySelectorAll("span")[1].style.opacity   = open ? "0" : "1";
  navToggle.querySelectorAll("span")[2].style.transform = open ? "rotate(-45deg) translate(5px, -5px)" : "";
});

// 모바일: 드롭다운 토글
document.querySelectorAll(".has-dropdown > .nav-link").forEach(link => {
  link.addEventListener("click", e => {
    if (window.innerWidth > 900) return;
    e.preventDefault();
    link.closest(".has-dropdown").classList.toggle("open");
  });
});

// 메뉴 링크 클릭 시 닫기
navMenu?.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => {
    if (window.innerWidth <= 900) navMenu.classList.remove("open");
  });
});

// 스크롤 시 네비바 그림자
window.addEventListener("scroll", () => {
  const nav = document.getElementById("navbar");
  nav?.classList.toggle("scrolled", window.scrollY > 60);
}, { passive: true });

// 앵커 스크롤 (오프셋 적용)
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
  });
});

// ============================================================
// 공지 탭 필터
// ============================================================
document.querySelectorAll(".nf-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderNoticesList(btn.dataset.filter);
  });
});

// ============================================================
// 갤러리 필터
// ============================================================
let currentGalleryFilter = "all";

document.querySelectorAll(".gf-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".gf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentGalleryFilter = btn.dataset.cat;
    galleryPage = 0;
    const filtered = currentGalleryFilter === "all"
      ? allGallery
      : allGallery.filter(p => p.category === currentGalleryFilter);
    renderGallery(filtered.slice(0, GALLERY_PER_PAGE));
    document.getElementById("loadMoreGallery").style.display =
      filtered.length > GALLERY_PER_PAGE ? "inline-flex" : "none";
  });
});

// 갤러리 더 보기
document.getElementById("loadMoreGallery")?.addEventListener("click", () => {
  galleryPage++;
  const filtered = currentGalleryFilter === "all"
    ? allGallery
    : allGallery.filter(p => p.category === currentGalleryFilter);
  const slice = filtered.slice(galleryPage * GALLERY_PER_PAGE, (galleryPage + 1) * GALLERY_PER_PAGE);
  renderGallery(slice, true);
  if ((galleryPage + 1) * GALLERY_PER_PAGE >= filtered.length) {
    document.getElementById("loadMoreGallery").style.display = "none";
  }
});

// ============================================================
// 프로그램 렌더
// ============================================================
const DEMO_PROGRAMS = [
  { id:"p1", name:"구름빵 독서교실", icon:"📖", target:"어린이", status:"운영 중", desc:"어린이들과 함께하는 즐거운 독서 활동과 창의 프로그램", isNew:false },
  { id:"p2", name:"문해교실", icon:"✏️", target:"어르신", status:"운영 중", desc:"읽고 쓰는 즐거움을 함께 나누는 어르신 문해 교육 프로그램", isNew:false },
  { id:"p3", name:"온세대 합창", icon:"🎵", target:"전 연령", status:"운영 중", desc:"세대를 넘어 함께 노래하는 마을 합창단 프로그램", isNew:false },
  { id:"p4", name:"공예·요리 활동", icon:"🎨", target:"전 연령", status:"운영 중", desc:"손으로 만들고 맛보는 생활문화 예술 체험 활동", isNew:false },
  { id:"p5", name:"풋살·체육 프로그램", icon:"⚽", target:"아동·청소년", status:"준비 중", desc:"김천 아이원스포츠와 연계한 전문 체육 프로그램. 월 1회, 총 7회기 운영 예정.", isNew:true },
  { id:"p6", name:"다자녀 동아리 모임", icon:"👨‍👩‍👧‍👦", target:"다자녀 가정", status:"시작 대기", desc:"다자녀 가정이 함께 경험과 정보를 나누는 건강한 지역 공동체 프로그램", isNew:true },
  { id:"p7", name:"마을기록 아카이빙", icon:"📷", target:"지역주민", status:"운영 중", desc:"마을의 기억과 이야기를 발굴하고 기록하는 마을 문화 보존 활동", isNew:false },
  { id:"p8", name:"원예 힐링 프로그램", icon:"🌱", target:"어르신·주민", status:"운영 중", desc:"자연과 함께하는 원예 치유 활동, 어르신 친화 야외 프로그램", isNew:false },
];

function renderPrograms(programs) {
  const el = document.getElementById("programsGrid");
  if (!el) return;
  if (!programs.length) {
    el.innerHTML = `<p class="loading-text">등록된 프로그램이 없습니다.</p>`;
    return;
  }
  const statusColor = { "운영 중":"#188038", "모집 중":"#1A73E8", "준비 중":"#B06000", "시작 대기":"#B06000", "종료":"#888" };
  el.innerHTML = programs.map(p => `
    <div class="program-card${p.isNew || p.isNew==='true' ? ' new-program' : ''}">
      ${p.isNew || p.isNew==='true' ? '<div class="new-badge">🆕 신규</div>' : ''}
      <div style="font-size:2rem;margin-bottom:8px;">${p.icon || '📌'}</div>
      <h4>${p.name}</h4>
      <p>${p.desc || ''}</p>
      <div class="pc-footer">
        <span class="pc-target">${p.target || ''}</span>
        ${p.status ? `<span class="pc-status" style="color:${statusColor[p.status]||'#888'};font-weight:600;font-size:0.8rem;">${p.status}</span>` : ''}
      </div>
    </div>
  `).join("");
}

// ============================================================
// 문의 폼
// ============================================================
document.getElementById("contactForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "전송 중...";

  const data = {
    name:    document.getElementById("cName").value.trim(),
    phone:   document.getElementById("cPhone").value.trim(),
    subject: document.getElementById("cSubject").value.trim(),
    message: document.getElementById("cMessage").value.trim(),
  };

  if (firebaseReady && db) {
    try {
      await addDoc(collection(db, "inquiries"), { ...data, createdAt: serverTimestamp() });
      alert("✅ 문의가 접수되었습니다.\n빠른 시간 내에 연락드리겠습니다.");
      e.target.reset();
    } catch (err) {
      console.error(err);
      alert("⚠️ 전송 중 오류가 발생했습니다.\n전화로 직접 문의해 주세요.");
    }
  } else {
    // 데모 모드
    setTimeout(() => {
      alert("✅ 문의가 접수되었습니다. (데모 모드)\nFirebase 연결 후 실제 저장됩니다.");
      e.target.reset();
    }, 600);
  }

  btn.disabled = false;
  btn.textContent = "문의 보내기 ✉️";
});

// ============================================================
// 데이터 로드
// ============================================================
async function loadData() {
  if (!firebaseReady || !db) {
    // 데모 데이터 사용
    allNotices = DEMO_NOTICES;
    allGallery  = DEMO_GALLERY;
    renderNoticesGrid(DEMO_NOTICES);
    renderNoticesList("all");
    renderSermonsGrid(DEMO_SERMONS);
    renderSermonsList(DEMO_SERMONS);
    renderPrograms(DEMO_PROGRAMS);
    renderGallery(DEMO_GALLERY.slice(0, GALLERY_PER_PAGE));
    document.getElementById("loadMoreGallery").style.display =
      DEMO_GALLERY.length > GALLERY_PER_PAGE ? "inline-flex" : "none";
    return;
  }

  // === 공지사항 ===
  try {
    const snap = await getDocs(query(collection(db, "notices"), orderBy("date", "desc"), limit(30)));
    allNotices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNoticesGrid(allNotices);
    renderNoticesList("all");
  } catch (err) {
    console.warn("공지 로드 오류:", err.message);
    allNotices = DEMO_NOTICES;
    renderNoticesGrid(DEMO_NOTICES);
    renderNoticesList("all");
  }

  // === 설교 ===
  try {
    const snap = await getDocs(query(collection(db, "sermons"), orderBy("date", "desc"), limit(20)));
    const sermons = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSermonsGrid(sermons);
    renderSermonsList(sermons);
  } catch (err) {
    console.warn("설교 로드 오류:", err.message);
    renderSermonsGrid(DEMO_SERMONS);
    renderSermonsList(DEMO_SERMONS);
  }

  // === 프로그램 ===
  try {
    const snap = await getDocs(collection(db, "programs"));
    const programs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPrograms(programs.length ? programs : DEMO_PROGRAMS);
  } catch (err) {
    console.warn("프로그램 로드 오류:", err.message);
    renderPrograms(DEMO_PROGRAMS);
  }

  // === 갤러리 ===
  try {
    const snap = await getDocs(query(collection(db, "gallery"), orderBy("date", "desc"), limit(100)));
    allGallery = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGallery(allGallery.slice(0, GALLERY_PER_PAGE));
    document.getElementById("loadMoreGallery").style.display =
      allGallery.length > GALLERY_PER_PAGE ? "inline-flex" : "none";
  } catch (err) {
    console.warn("갤러리 로드 오류:", err.message);
    allGallery = DEMO_GALLERY;
    renderGallery(DEMO_GALLERY.slice(0, GALLERY_PER_PAGE));
  }
}

// 초기화
loadData();