# 추풍령교회 · 구름바람 작은도서관 홈페이지

예장고신 추풍령교회와 구름바람 작은도서관 공식 홈페이지입니다.

---

## 📁 파일 구조

```
chupungnyeong/
├── index.html          ← 메인 홈페이지
├── css/
│   └── style.css       ← 전체 스타일
├── js/
│   └── app.js          ← Firebase 연동 + 데이터 로직
├── admin/
│   └── index.html      ← 관리자 패널
├── firebase.json       ← Firebase Hosting 설정
├── .firebaserc         ← Firebase 프로젝트 연결
├── firestore.rules     ← Firestore 보안 규칙
└── storage.rules       ← Storage 보안 규칙
```

---

## 🚀 첫 배포 순서

### 1단계. Firebase 프로젝트 만들기

1. [Firebase 콘솔](https://console.firebase.google.com) 접속 → 구글 계정 로그인
2. **프로젝트 추가** 클릭 → 프로젝트 이름 입력 (예: `chupungnyeong-church`)
3. Google Analytics는 선택 사항 → **프로젝트 만들기**

### 2단계. 필요한 서비스 활성화

Firebase 콘솔 왼쪽 메뉴에서:

| 서비스 | 경로 | 설정 |
|--------|------|------|
| **Authentication** | Build → Authentication | 시작하기 → 이메일/비밀번호 활성화 |
| **Firestore** | Build → Firestore Database | 데이터베이스 만들기 → **프로덕션 모드** |
| **Storage** | Build → Storage | 시작하기 → 기본 위치 선택 |
| **Hosting** | Build → Hosting | 시작하기 |

### 3단계. 관리자 계정 만들기

**Authentication → 사용자 → 사용자 추가**
- 이메일: 교회 공식 이메일 (예: chupungnyeong@gmail.com)
- 비밀번호: 안전한 비밀번호 설정

> ⚠️ 이 계정 정보는 반드시 안전한 곳에 보관하세요.

### 4단계. Firebase 설정값 복사

1. Firebase 콘솔 → **프로젝트 설정** (⚙️ 아이콘)
2. **앱** 탭 → 웹 앱 추가 (`</>` 아이콘) → 앱 이름 입력
3. `firebaseConfig` 객체의 값들을 복사

### 5단계. 코드에 설정값 입력

**js/app.js** 파일 상단의 `firebaseConfig`를 수정하세요:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",          // ← 복사한 값으로 교체
  authDomain: "chupungnyeong-church.firebaseapp.com",
  projectId: "chupungnyeong-church",
  storageBucket: "chupungnyeong-church.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**admin/index.html** 에도 동일한 값을 입력하세요 (파일 하단 `firebaseConfig` 부분).

### 6단계. 보안 규칙 배포

Firebase 콘솔에서 직접 규칙을 입력하거나, Firebase CLI를 사용합니다.

**방법 A - 콘솔에서 직접 입력 (권장):**

- **Firestore** → 규칙 탭 → `firestore.rules` 파일 내용 붙여넣기 → 게시
- **Storage** → 규칙 탭 → `storage.rules` 파일 내용 붙여넣기 → 게시

**방법 B - Firebase CLI:**
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules
```

### 7단계. 사이트 배포

**방법 A - 드래그 앤 드롭 (가장 쉬운 방법):**
1. Firebase 콘솔 → Hosting → "시작하기" 완료
2. 배포 탭에서 파일을 직접 업로드

**방법 B - Firebase CLI:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting        # 설정 시 "public directory"를 . (현재폴더)로 입력
firebase deploy --only hosting
```

---

## 🎛️ 관리자 패널 사용법

주소: `https://[내도메인]/admin/`

### 로그인
- Firebase Authentication에서 만든 이메일/비밀번호로 로그인

### 공지·행사 관리
- **새 공지 등록** 버튼 → 분류(교회/도서관/행사), 날짜, 제목, 내용 입력
- 목록에서 **수정** / **삭제** 가능

### 설교 등록
- 유튜브에 설교 영상 업로드 후 URL 복사
- **설교 등록** → 제목, 설교자, 날짜, 본문, 유튜브 URL 입력
- **미리보기** 버튼으로 썸네일 확인 후 저장

### 사진 업로드
- 갤러리 탭 → 카테고리/날짜 선택 → 사진 드래그하거나 클릭해서 선택
- 여러 장 동시 업로드 가능 → **업로드** 버튼

### 프로그램 관리
- 도서관 프로그램 추가/수정/삭제
- 신규 프로그램은 "신규 🆕" 표시 가능

---

## 🌐 도메인 연결 (선택)

Firebase Hosting에서 커스텀 도메인 연결:
1. Hosting → 커스텀 도메인 추가
2. 도메인 등록업체에서 제공하는 DNS 레코드 추가
3. SSL 인증서 자동 발급 (약 24시간 소요)

---

## 💡 자주 묻는 질문

**Q. 사진이 업로드되지 않아요**
→ Firebase Storage 규칙을 확인하세요. 관리자 로그인 후 업로드 가능합니다.

**Q. 공지를 올렸는데 홈페이지에 안 보여요**
→ Firestore 규칙에서 공개 읽기가 허용되어 있는지 확인하세요.

**Q. 관리자 비밀번호를 바꾸고 싶어요**
→ Firebase 콘솔 → Authentication → 해당 사용자 → 비밀번호 재설정

**Q. 무료 범위가 궁금해요**
→ Firebase Spark 플랜 (무료) 기준:
- Firestore: 1GB 저장, 읽기 5만/일
- Storage: 5GB 저장, 전송 1GB/일
- Hosting: 10GB 저장, 전송 360MB/일
→ 소규모 교회 운영에는 무료 범위로 충분합니다.

---

## 📞 기술 문의

제작: 박성준  
관련: 추풍령교회 김철홍 목사
