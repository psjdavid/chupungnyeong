// ============================================================
// 추풍령교회 · 구름바람 작은도서관 - Main App JS
// Firebase Modular SDK v10
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, getDoc, addDoc, doc, updateDoc,
  query, orderBy, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// FIREBASE 설정
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

let db = null;
try {
  db = getFirestore(initializeApp(firebaseConfig));
} catch (e) {
  console.warn("Firebase 초기화 오류:", e.message);
}

// ============================================================
// 유틸리티
// ============================================================

/** HTML 특수문자 이스케이프 (모든 사용자 데이터 출력에 사용) */
function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function toDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (raw?.toDate) return raw.toDate();          // Firestore Timestamp
  if (typeof raw === "string") { const d = new Date(raw); return isNaN(d) ? null : d; }
  return null;
}

function formatDate(raw) {
  const d = toDate(raw);
  if (!d) return "";
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function dateKey(raw) {
  // 정렬용 문자열 키 (YYYY-MM-DD 또는 ISO)
  if (typeof raw === "string") return raw;
  const d = toDate(raw);
  return d ? d.toISOString() : "";
}

function extractYTId(str = "") {
  const m = String(str).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(str) ? str : null;
}

function resolveVideoId(item) {
  return extractYTId(item.youtubeId || "") || extractYTId(item.youtubeUrl || "");
}

function ytThumb(id) { return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : ""; }
function ytLink(id, item) { return id ? `https://www.youtube.com/watch?v=${id}` : (item.youtubeUrl || "#"); }

function viewsText(n) { return `조회 ${Number(n || 0).toLocaleString("ko-KR")}`; }

function safeStorage(fn) { try { return fn(); } catch { return null; } }

const NOTICE_CAT = { church: "⛪ 교회", library: "📚 도서관", event: "📅 행사" };
const GALLERY_CAT = { church: "교회", worship: "예배", library: "도서관", program: "프로그램", event: "행사" };
const VIDEO_CAT = { praise: "🎵 찬양", event: "📅 행사", library: "📚 도서관", etc: "기타" };

// ============================================================
// 조회수 (같은 브라우저 세션에서는 한 번만 올림)
// ============================================================
const store = { notices: new Map(), sermons: new Map(), videos: new Map(), gallery: new Map() };

async function addView(col, id) {
  const item = store[col]?.get(id);
  if (!item || !db) return;
  const key = `viewed:${col}:${id}`;
  if (safeStorage(() => sessionStorage.getItem(key))) return;
  safeStorage(() => sessionStorage.setItem(key, "1"));
  item.views = (item.views || 0) + 1;
  document.querySelectorAll(`[data-views="${col}:${id}"]`).forEach(el => { el.textContent = viewsText(item.views); });
  try {
    await updateDoc(doc(db, col, id), { views: increment(1) });
  } catch (err) {
    console.warn("조회수 저장 실패:", err.message);
  }
}

// ============================================================
// 목록 컴포넌트: 검색 + 필터 + 페이지 번호
// ============================================================
function createListView({ listEl, pagerEl, searchEl, perPage, render, emptyText, searchText }) {
  const st = { items: [], filter: () => true, q: "", page: 1, error: false };

  function filtered() {
    const q = st.q.trim().toLowerCase();
    return st.items.filter(st.filter).filter(x => !q || searchText(x).toLowerCase().includes(q));
  }

  function draw(scroll = false) {
    if (!listEl) return;
    if (st.error) {
      listEl.innerHTML = `<p class="loading-text" style="grid-column:1/-1">목록을 불러오지 못했습니다. 잠시 후 새로고침 해주세요.</p>`;
      if (pagerEl) pagerEl.innerHTML = "";
      return;
    }
    const arr = filtered();
    const pages = Math.max(1, Math.ceil(arr.length / perPage));
    st.page = Math.min(Math.max(1, st.page), pages);
    const slice = arr.slice((st.page - 1) * perPage, st.page * perPage);
    listEl.innerHTML = slice.length
      ? render(slice)
      : `<p class="loading-text" style="grid-column:1/-1">${st.q.trim() ? "검색 결과가 없습니다." : emptyText}</p>`;
    renderPager(pagerEl, st.page, pages, p => { st.page = p; draw(true); });
    if (scroll) scrollToEl(listEl, 140);
  }

  let t;
  searchEl?.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { st.q = searchEl.value; st.page = 1; draw(); }, 200);
  });

  return {
    set(items) { st.items = items; st.error = false; draw(); },
    fail() { st.error = true; draw(); },
    setFilter(fn) { st.filter = fn; st.page = 1; draw(); },
  };
}

function renderPager(el, page, pages, go) {
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ""; return; }
  const win = 5;
  let start = Math.max(1, page - Math.floor(win / 2));
  let end = Math.min(pages, start + win - 1);
  start = Math.max(1, end - win + 1);
  const btn = (p, label, opts = {}) =>
    `<button type="button" class="pager-btn${opts.active ? " active" : ""}" data-p="${p}" ${opts.disabled ? "disabled" : ""} aria-label="${opts.aria || `${p} 페이지`}">${label}</button>`;
  let html = btn(page - 1, "‹", { disabled: page === 1, aria: "이전 페이지" });
  if (start > 1) html += btn(1, "1") + (start > 2 ? `<span class="pager-gap">…</span>` : "");
  for (let p = start; p <= end; p++) html += btn(p, p, { active: p === page });
  if (end < pages) html += (end < pages - 1 ? `<span class="pager-gap">…</span>` : "") + btn(pages, pages);
  html += btn(page + 1, "›", { disabled: page === pages, aria: "다음 페이지" });
  el.innerHTML = html;
  el.onclick = e => {
    const b = e.target.closest(".pager-btn");
    if (b && !b.disabled) go(Number(b.dataset.p));
  };
}

// ============================================================
// 공지
// ============================================================
function isPinned(n) {
  if (!n.pinned) return false;
  return !n.pinUntil || n.pinUntil >= todayStr();   // 고정 해제일이 지나면 자동 해제
}

function sortNotices(list) {
  return [...list].sort((a, b) =>
    (isPinned(b) - isPinned(a)) || dateKey(b.date).localeCompare(dateKey(a.date)));
}

function renderNoticesGrid(notices) {
  const el = document.getElementById("noticesGrid");
  if (!el) return;
  if (!notices.length) { el.innerHTML = `<p class="loading-text" style="grid-column:1/-1">등록된 공지사항이 없습니다.</p>`; return; }
  el.innerHTML = notices.slice(0, 3).map(n => `
    <div class="notice-card cat-${esc(n.category)}${isPinned(n) ? " pinned" : ""}" data-notice="${esc(n.id)}" tabindex="0" role="button">
      <div class="nc-cat ${n.category === "library" ? "library" : ""}">${isPinned(n) ? '<span class="pin-badge">📌 중요</span>' : ""}${NOTICE_CAT[n.category] || "교회"}</div>
      <div class="nc-title">${esc(n.title)}</div>
      <div class="nc-date">${formatDate(n.date)} · <span data-views="notices:${esc(n.id)}">${viewsText(n.views)}</span></div>
    </div>`).join("");
}

const noticesView = createListView({
  listEl: document.getElementById("noticesFullList"),
  pagerEl: document.getElementById("noticesPager"),
  searchEl: document.getElementById("noticeSearch"),
  perPage: 10,
  emptyText: "등록된 공지사항이 없습니다.",
  searchText: n => `${n.title} ${n.content || ""}`,
  render: list => list.map(n => `
    <div class="notice-row cat-${esc(n.category)}${isPinned(n) ? " pinned" : ""}" data-notice="${esc(n.id)}" tabindex="0" role="button">
      <div class="nr-left">
        <div class="nr-cat ${esc(n.category)}">${isPinned(n) ? '<span class="pin-badge">📌 중요</span>' : ""}${NOTICE_CAT[n.category] || "교회"}</div>
        <div class="nr-title">${esc(n.title)}</div>
      </div>
      <div class="nr-date">${formatDate(n.date)}<br><span data-views="notices:${esc(n.id)}">${viewsText(n.views)}</span></div>
    </div>`).join(""),
});

function openNotice(id) {
  const n = store.notices.get(id);
  if (!n) return;
  addView("notices", id);
  document.getElementById("noticeModalContent").innerHTML = `
    <div class="notice-modal-cat">${isPinned(n) ? "📌 중요 · " : ""}${NOTICE_CAT[n.category] || "교회"}</div>
    <div class="notice-modal-title">${esc(n.title)}</div>
    <div class="notice-modal-date">${formatDate(n.date)} · <span data-views="notices:${esc(n.id)}">${viewsText(n.views)}</span></div>
    <div class="notice-modal-body">${esc(n.content || "내용이 없습니다.")}</div>`;
  document.getElementById("noticeModal")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

document.addEventListener("click", e => {
  const card = e.target.closest("[data-notice]");
  if (card) openNotice(card.dataset.notice);
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const card = e.target.closest?.("[data-notice]");
  if (card) openNotice(card.dataset.notice);
});

// ============================================================
// 설교
// ============================================================
function renderSermonsGrid(sermons) {
  const el = document.getElementById("sermonsGridHome");
  if (!el) return;
  if (!sermons.length) { el.innerHTML = `<p class="loading-text" style="grid-column:1/-1">등록된 설교가 없습니다.</p>`; return; }
  el.innerHTML = sermons.slice(0, 3).map(s => {
    const vid = resolveVideoId(s);
    return `
    <div class="sermon-card">
      <a href="${esc(ytLink(vid, s))}" target="_blank" rel="noopener" data-view="sermons:${esc(s.id)}">
        <div class="sermon-thumb">
          ${vid ? `<img src="${ytThumb(vid)}" alt="${esc(s.title)}" loading="lazy">` : ""}
          <div class="sermon-play-btn"><div class="play-circle">▶</div></div>
        </div>
      </a>
      <div class="sermon-body">
        <div class="sermon-title">${esc(s.title)}</div>
        <div class="sermon-meta">
          ${s.scripture ? `<span class="meta-scripture">📖 ${esc(s.scripture)}</span>` : ""}
          <span>${formatDate(s.date)}</span>
          <span data-views="sermons:${esc(s.id)}">${viewsText(s.views)}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

const sermonsView = createListView({
  listEl: document.getElementById("sermonsListFull"),
  pagerEl: document.getElementById("sermonsPager"),
  searchEl: document.getElementById("sermonSearch"),
  perPage: 10,
  emptyText: "등록된 설교가 없습니다.",
  searchText: s => `${s.title} ${s.scripture || ""} ${s.preacher || ""}`,
  render: list => list.map(s => {
    const vid = resolveVideoId(s);
    return `
    <div class="sermon-row">
      <span class="sr-date">${formatDate(s.date)}</span>
      <div class="sr-main">
        <span class="sr-title">${esc(s.title)}</span>
        <span class="sr-scripture">${s.scripture ? `📖 ${esc(s.scripture)}` : ""}${s.preacher ? ` · ${esc(s.preacher)}` : ""} · <span data-views="sermons:${esc(s.id)}">${viewsText(s.views)}</span></span>
      </div>
      <a class="sr-link" href="${esc(ytLink(vid, s))}" target="_blank" rel="noopener" data-view="sermons:${esc(s.id)}">▶ 시청하기</a>
    </div>`;
  }).join(""),
});

// ============================================================
// 일반 영상 게시판
// ============================================================
const videosView = createListView({
  listEl: document.getElementById("videosGrid"),
  pagerEl: document.getElementById("videosPager"),
  searchEl: document.getElementById("videoSearch"),
  perPage: 9,
  emptyText: "등록된 영상이 없습니다.",
  searchText: v => `${v.title} ${v.description || ""}`,
  render: list => list.map(v => {
    const vid = resolveVideoId(v);
    return `
    <div class="sermon-card">
      <a href="${esc(ytLink(vid, v))}" target="_blank" rel="noopener" data-view="videos:${esc(v.id)}">
        <div class="sermon-thumb">
          ${vid ? `<img src="${ytThumb(vid)}" alt="${esc(v.title)}" loading="lazy">` : ""}
          <div class="sermon-play-btn"><div class="play-circle">▶</div></div>
        </div>
      </a>
      <div class="sermon-body">
        <div class="video-cat">${VIDEO_CAT[v.category] || "기타"}</div>
        <div class="sermon-title">${esc(v.title)}</div>
        ${v.description ? `<p class="video-desc">${esc(v.description)}</p>` : ""}
        <div class="sermon-meta">
          <span>${formatDate(v.date)}</span>
          <span data-views="videos:${esc(v.id)}">${viewsText(v.views)}</span>
        </div>
      </div>
    </div>`;
  }).join(""),
});

document.querySelectorAll("#videoFilters .nf-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#videoFilters .nf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    videosView.setFilter(f === "all" ? () => true : v => (v.category || "etc") === f);
  });
});

// 설교·영상 링크 클릭 시 조회수 +1
document.addEventListener("click", e => {
  const a = e.target.closest("[data-view]");
  if (!a) return;
  const [col, id] = a.dataset.view.split(":");
  addView(col, id);
});

// ============================================================
// 갤러리
// ============================================================
const galleryView = createListView({
  listEl: document.getElementById("galleryGrid"),
  pagerEl: document.getElementById("galleryPager"),
  searchEl: document.getElementById("gallerySearch"),
  perPage: 12,
  emptyText: "등록된 사진이 없습니다.",
  searchText: g => g.title || "",
  render: list => list.map(g => {
    const urls = g.urls?.length ? g.urls : (g.url ? [g.url] : []);
    const extra = urls.length - 1;
    return `
    <div class="gallery-card" data-gallery="${esc(g.id)}" tabindex="0" role="button" aria-label="${esc(g.title || "활동 사진")} 사진 보기">
      <div class="gallery-item">
        ${urls[0] ? `<img src="${esc(urls[0])}" alt="${esc(g.title || "")}" loading="lazy">` : ""}
        ${extra > 0 ? `<div class="gallery-group-badge">+${extra}</div>` : ""}
      </div>
      <div class="gallery-caption">
        <strong>${esc(g.title || "활동 사진")}</strong>
        <span>${formatDate(g.date)} · <span data-views="gallery:${esc(g.id)}">${viewsText(g.views)}</span></span>
      </div>
    </div>`;
  }).join(""),
});

document.querySelectorAll(".gf-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".gf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const c = btn.dataset.cat;
    galleryView.setFilter(c === "all" ? () => true : g => g.category === c);
  });
});

function openGallery(id) {
  const g = store.gallery.get(id);
  if (!g) return;
  const urls = g.urls?.length ? g.urls : (g.url ? [g.url] : []);
  if (!urls.length) return;
  addView("gallery", id);
  openCarousel(urls, `${g.title || ""}${g.date ? ` · ${formatDate(g.date)}` : ""}`, 0);
}

document.addEventListener("click", e => {
  const card = e.target.closest("[data-gallery]");
  if (card) openGallery(card.dataset.gallery);
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const card = e.target.closest?.("[data-gallery]");
  if (card) openGallery(card.dataset.gallery);
});

// ============================================================
// 사진 캐러셀 모달 (터치 스와이프 지원)
// ============================================================
let _carouselUrls = [];
let _carouselIdx  = 0;
let _carouselCaption = "";

function openCarousel(urls, caption, startIdx) {
  _carouselUrls    = urls;
  _carouselIdx     = startIdx || 0;
  _carouselCaption = caption || "";
  _updateCarousel();
  document.getElementById("imgModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function _updateCarousel() {
  document.getElementById("imgModalSrc").src = _carouselUrls[_carouselIdx];
  document.getElementById("imgModalCaption").textContent = _carouselCaption;
  document.getElementById("carouselCounter").textContent =
    _carouselUrls.length > 1 ? `${_carouselIdx + 1} / ${_carouselUrls.length}` : "";
  document.getElementById("carouselPrev").style.display = _carouselIdx > 0 ? "" : "none";
  document.getElementById("carouselNext").style.display = _carouselIdx < _carouselUrls.length - 1 ? "" : "none";
}

function carouselMove(d) {
  const n = _carouselIdx + d;
  if (n < 0 || n >= _carouselUrls.length) return;
  _carouselIdx = n;
  _updateCarousel();
}

document.getElementById("carouselPrev")?.addEventListener("click", e => { e.stopPropagation(); carouselMove(-1); });
document.getElementById("carouselNext")?.addEventListener("click", e => { e.stopPropagation(); carouselMove(1); });

let _touchX = null;
const imgModalEl = document.getElementById("imgModal");
imgModalEl?.addEventListener("touchstart", e => { _touchX = e.touches[0].clientX; }, { passive: true });
imgModalEl?.addEventListener("touchend", e => {
  if (_touchX === null) return;
  const dx = e.changedTouches[0].clientX - _touchX;
  _touchX = null;
  if (Math.abs(dx) > 50) carouselMove(dx < 0 ? 1 : -1);
});

function closeNoticeModal() {
  document.getElementById("noticeModal")?.classList.remove("open");
  document.body.style.overflow = "";
}
function closeImgModal() {
  document.getElementById("imgModal")?.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("imgModalClose")?.addEventListener("click", closeImgModal);
document.getElementById("imgModalBg")?.addEventListener("click", closeImgModal);
document.getElementById("noticeModalClose")?.addEventListener("click", closeNoticeModal);
document.getElementById("noticeModalBg")?.addEventListener("click", closeNoticeModal);

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeImgModal(); closeNoticeModal(); }
  if (document.getElementById("imgModal")?.classList.contains("open")) {
    if (e.key === "ArrowLeft") carouselMove(-1);
    if (e.key === "ArrowRight") carouselMove(1);
  }
});

// ============================================================
// 페이지 이동 (홈 / 교회소개 / 예배와 말씀 / 교회사역 / 도서관 / 공지 / 문의)
// ============================================================
const PAGE_TITLES = {
  home: "", about: "교회소개", worship: "예배와 말씀", ministry: "교회사역",
  library: "구름바람 작은도서관", notices: "공지/행사", contact: "문의하기",
};
const BASE_TITLE = "추풍령교회 · 구름바람 작은도서관";
let currentPage = null;

function scrollToEl(el, offset = 84) {
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
}

function pagesOf(el) {
  return (el.closest("[data-page]")?.dataset.page || "home").split(" ");
}

function showPage(page) {
  if (page === currentPage) return;
  currentPage = page;
  document.querySelectorAll("[data-page]").forEach(sec => {
    sec.hidden = !sec.dataset.page.split(" ").includes(page);
  });
  document.body.classList.toggle("subpage", page !== "home");
  document.querySelectorAll(".nav-link[data-nav]").forEach(a => {
    a.classList.toggle("active-link", a.dataset.nav === page);
  });
  document.title = PAGE_TITLES[page] ? `${PAGE_TITLES[page]} | ${BASE_TITLE}` : BASE_TITLE;
  if (page === "about") setTimeout(() => window.relayoutKakaoMap?.(), 50);
}

function route(hash, smooth = true) {
  const id = (hash || "").replace(/^#/, "");
  if (!id || id === "home") {
    showPage("home");
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    return;
  }
  const target = document.getElementById(id);
  if (!target) { showPage("home"); window.scrollTo(0, 0); return; }

  const candidates = pagesOf(target);
  // 섹션 자체를 가리키면 전용 페이지로, 섹션 안 요소면 지금 페이지에 있을 때 그대로
  const dedicated = candidates[candidates.length - 1];
  const page = target.dataset.page ? dedicated
    : (candidates.includes(currentPage) ? currentPage : dedicated);
  const changed = page !== currentPage;
  showPage(page);

  if (target.dataset.page && page !== "home") {
    window.scrollTo({ top: 0, behavior: changed ? "auto" : (smooth ? "smooth" : "auto") });
  } else if (changed) {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => scrollToEl(target));
  } else {
    scrollToEl(target);
  }
}

document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const hash = a.getAttribute("href");
  if (!hash || hash === "#") return;
  // 모바일 메뉴에서 드롭다운 부모 링크는 펼치기만
  if (a.matches(".has-dropdown > .nav-link") && window.innerWidth <= 900) return;
  e.preventDefault();
  if (location.hash !== hash) history.pushState(null, "", hash);
  route(hash);
  closeMobileMenu();
});

// 뒤로가기/앞으로가기, 주소창에서 #... 직접 변경
window.addEventListener("popstate", () => { closeMobileMenu(); route(location.hash, false); });
window.addEventListener("hashchange", () => { closeMobileMenu(); route(location.hash, false); });

// ============================================================
// 네비게이션
// ============================================================
const navToggle = document.getElementById("navToggle");
const navMenu   = document.getElementById("navMenu");

function setToggleIcon(open) {
  const s = navToggle?.querySelectorAll("span");
  if (!s) return;
  navToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  s[0].style.transform = open ? "rotate(45deg) translate(5px, 5px)" : "";
  s[1].style.opacity   = open ? "0" : "1";
  s[2].style.transform = open ? "rotate(-45deg) translate(5px, -5px)" : "";
}

function closeMobileMenu() {
  if (window.innerWidth > 900) return;
  navMenu?.classList.remove("open");
  setToggleIcon(false);
}

navToggle?.addEventListener("click", () => {
  navMenu.classList.toggle("open");
  setToggleIcon(navMenu.classList.contains("open"));
});

// 모바일: 드롭다운 토글
document.querySelectorAll(".has-dropdown > .nav-link").forEach(link => {
  link.addEventListener("click", e => {
    if (window.innerWidth > 900) return;
    e.preventDefault();
    link.closest(".has-dropdown").classList.toggle("open");
  });
});

window.addEventListener("scroll", () => {
  document.getElementById("navbar")?.classList.toggle("scrolled", window.scrollY > 60);
}, { passive: true });

// ============================================================
// 공지 탭 필터
// ============================================================
document.querySelectorAll("#notices .nf-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#notices .nf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    noticesView.setFilter(f === "all" ? () => true : n => n.category === f);
  });
});

// ============================================================
// 프로그램
// ============================================================
function renderPrograms(programs) {
  const el = document.getElementById("programsGrid");
  if (!el) return;
  if (!programs.length) {
    el.innerHTML = `<p class="loading-text" style="grid-column:1/-1">등록된 프로그램이 없습니다.</p>`;
    return;
  }
  const statusColor = { "운영 중":"#188038", "모집 중":"#1A73E8", "준비 중":"#B06000", "시작 대기":"#B06000", "종료":"#888" };
  el.innerHTML = programs.map(p => {
    const isNew = p.isNew === true || p.isNew === "true";
    return `
    <div class="program-card${isNew ? " new-program" : ""}">
      ${isNew ? '<div class="new-badge">🆕 신규</div>' : ""}
      <div style="font-size:2rem;margin-bottom:8px;">${esc(p.icon || "📌")}</div>
      <h4>${esc(p.name)}</h4>
      <p>${esc(p.desc || "")}</p>
      ${p.detail ? `<p class="pc-detail">${esc(p.detail)}</p>` : ""}
      <div class="pc-footer">
        <span class="pc-target">${esc(p.target || "")}</span>
        ${p.status ? `<span class="pc-status" style="color:${statusColor[p.status] || "#888"};font-weight:600;font-size:0.8rem;">${esc(p.status)}</span>` : ""}
      </div>
    </div>`;
  }).join("");
}

// ============================================================
// 사이트 설정 (도서관 운영시간 — 관리자 페이지에서 한 곳만 바꾸면 모든 화면에 반영)
// ============================================================
function applySettings(s) {
  document.querySelectorAll("[data-setting]").forEach(el => {
    const v = s[el.dataset.setting];
    if (typeof v === "string" && v.trim()) el.textContent = v.trim();
  });
}

// ============================================================
// 문의 폼
// ============================================================
document.getElementById("contactForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById("submitBtn");

  const data = {
    name:    document.getElementById("cName").value.trim(),
    phone:   document.getElementById("cPhone").value.trim(),
    subject: document.getElementById("cSubject").value.trim(),
    message: document.getElementById("cMessage").value.trim(),
  };

  const missing = [["name", "cName", "이름"], ["subject", "cSubject", "제목"], ["message", "cMessage", "내용"]]
    .find(([k]) => !data[k]);
  if (missing) {
    alert(`${missing[2]}을(를) 입력해주세요.`);
    document.getElementById(missing[1]).focus();
    return;
  }
  if (!db) { alert("⚠️ 지금은 문의를 보낼 수 없습니다.\n전화로 직접 문의해 주세요."); return; }

  btn.disabled = true;
  btn.textContent = "전송 중...";
  try {
    await addDoc(collection(db, "inquiries"), { ...data, confirmed: false, createdAt: serverTimestamp() });
    alert("✅ 문의가 접수되었습니다.\n빠른 시간 내에 연락드리겠습니다.");
    form.reset();
  } catch (err) {
    console.error(err);
    alert("⚠️ 전송 중 오류가 발생했습니다.\n전화로 직접 문의해 주세요.");
  } finally {
    btn.disabled = false;
    btn.textContent = "문의 보내기 ✉️";
  }
});

// ============================================================
// 데이터 로드
// ============================================================
async function fetchAll(col, order) {
  const ref = collection(db, col);
  const snap = await getDocs(order ? query(ref, orderBy(order, "desc")) : ref);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  store[col]?.clear();
  items.forEach(it => store[col]?.set(it.id, it));
  return items;
}

const byDateDesc = (a, b) =>
  dateKey(b.date).localeCompare(dateKey(a.date)) || dateKey(b.createdAt).localeCompare(dateKey(a.createdAt));

async function loadData() {
  if (!db) {
    [noticesView, sermonsView, videosView, galleryView].forEach(v => v.fail());
    return;
  }

  const tasks = [
    // 사이트 설정
    getDoc(doc(db, "settings", "site"))
      .then(s => { if (s.exists()) applySettings(s.data()); })
      .catch(err => console.warn("설정 로드 오류:", err.message)),

    // 공지 (고정 공지 우선, 그다음 최신순)
    fetchAll("notices", "date").then(items => {
      const sorted = sortNotices(items);
      renderNoticesGrid(sorted);
      noticesView.set(sorted);
    }).catch(err => {
      console.warn("공지 로드 오류:", err.message);
      document.getElementById("noticesGrid").innerHTML = `<p class="loading-text" style="grid-column:1/-1">공지를 불러오지 못했습니다.</p>`;
      noticesView.fail();
    }),

    // 설교
    fetchAll("sermons", "date").then(items => {
      renderSermonsGrid(items);
      sermonsView.set(items);
    }).catch(err => {
      console.warn("설교 로드 오류:", err.message);
      document.getElementById("sermonsGridHome").innerHTML = `<p class="loading-text" style="grid-column:1/-1">설교를 불러오지 못했습니다.</p>`;
      sermonsView.fail();
    }),

    // 일반 영상
    fetchAll("videos").then(items => {
      videosView.set(items.sort(byDateDesc));
    }).catch(err => {
      console.warn("영상 로드 오류:", err.message);
      videosView.set([]);
    }),

    // 프로그램
    getDocs(collection(db, "programs")).then(snap => {
      renderPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(err => {
      console.warn("프로그램 로드 오류:", err.message);
      renderPrograms([]);
    }),

    // 갤러리 (행사 날짜 최신순)
    fetchAll("gallery").then(items => {
      galleryView.set(items.sort(byDateDesc));
    }).catch(err => {
      console.warn("갤러리 로드 오류:", err.message);
      galleryView.fail();
    }),
  ];

  await Promise.all(tasks);

  // 데이터가 그려지면 위치가 밀리므로, 주소(#...)가 페이지 안의 특정 위치라면 다시 맞춰 줌
  const t = location.hash && document.getElementById(location.hash.slice(1));
  if (t && !t.dataset.page && !t.closest("[hidden]")) scrollToEl(t);
}

// 초기화
route(location.hash, false);
loadData();
