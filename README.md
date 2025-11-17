# 📊 Database Project - 주식 데이터 분석 플랫폼

한국 주식 시장의 실시간 데이터를 수집하고 시각화하는 웹 애플리케이션입니다.

## 🏗️ 프로젝트 구조

```
database_project/
├── back/                   # 백엔드 (Node.js + Python)
│   ├── app.js             # Node.js 웹 서버 (메인)
│   ├── ka10001_주식현재가.py      # 키움 API - 현재가 조회
│   ├── ka10004_주식호가.py        # 키움 API - 호가 조회
│   ├── ka10005_주식종목정보.py    # 키움 API - 종목정보
│   ├── ka10081_주식일봉차트.py    # 키움 API - 일봉 차트
│   ├── package.json       # Node.js 의존성
│   ├── requirements.txt   # Python 의존성
│   └── README.md          # 백엔드 문서
│
├── front/                 # 프론트엔드 (Vanilla JS)
│   ├── index.html         # 메인 페이지
│   ├── script.js          # JavaScript 로직
│   ├── style.css          # 스타일시트
│   └── README.md          # 프론트엔드 문서
│
├── .github/               # GitHub Actions 워크플로우
│   └── workflows/         # 자동화 스크립트
└── README.md             # 프로젝트 개요
```

## 🚀 주요 기능

### ✅ 완료된 기능
- **실시간 주가 조회**: 키움증권 REST API (ka10001) 연동
- **일봉 차트 시각화**: 720일 주가 데이터를 Chart.js로 표시
- **3개 종목 모니터링**: 삼성전자, SK하이닉스, NAVER 실시간 추적
- **반응형 웹 디자인**: 모바일/데스크톱 지원
- **자동 브랜치 생성**: GitHub Actions를 통한 이슈 기반 브랜치 자동화

### 🔄 개발 중
- 더 많은 종목 추가
- 실시간 데이터 스트리밍
- 사용자 맞춤 대시보드

## 🛠️ 기술 스택

### 백엔드
- **Node.js**: HTTP 서버 및 API 프록시
- **Python**: 키움증권 API 테스트 스크립트
- **키움증권 REST API**: 실시간 주식 데이터

### 프론트엔드
- **Vanilla JavaScript**: 순수 자바스크립트
- **Chart.js**: 주가 차트 시각화
- **HTML5 & CSS3**: 반응형 UI

### DevOps
- **GitHub Actions**: CI/CD 자동화
- **Git Flow**: 브랜치 전략

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 18 이상
- Python 3.8 이상
- 키움증권 API 키 (appkey, secretkey)

### 백엔드 설정
```bash
cd back

# Node.js 의존성 설치
npm install

# 서버 시작
node app.js
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 프론트엔드
브라우저에서 `http://localhost:3000` 접속하면 자동으로 프론트엔드가 로드됩니다.

### Python 테스트 스크립트 (선택사항)
```bash
# Python 의존성 설치
pip install -r requirements.txt

# 개별 API 테스트
python ka10001_주식현재가.py
python ka10081_주식일봉차트.py
```

## 🎯 API 엔드포인트

### `/api/stocks`
- **Method**: GET
- **설명**: 3개 종목의 현재가 데이터 조회
- **응답**: JSON 배열 (삼성전자, SK하이닉스, NAVER)

### `/api/chart/:symbol`
- **Method**: GET
- **설명**: 특정 종목의 720일 일봉 차트 데이터
- **예시**: `/api/chart/005930` (삼성전자)

## 📊 사용 중인 키움 API

| API ID | 이름 | 용도 | 엔드포인트 |
|--------|------|------|-----------|
| ka10001 | 주식현재가 | 실시간 주가 | `/api/dostk/stkinfo` |
| ka10004 | 주식호가 | 매수/매도 호가 | `/api/dostk/mrkcond` |
| ka10081 | 주식일봉차트 | 일별 주가 차트 | `/api/dostk/chart` |

## 🔄 개발 진행 상황

- [x] 키움증권 REST API 연동
- [x] Node.js 백엔드 서버 구축
- [x] 실시간 주가 조회 기능
- [x] Chart.js 일봉 차트 시각화
- [x] 반응형 웹 UI
- [x] GitHub Actions 자동화
- [ ] 더 많은 종목 지원
- [ ] 사용자 맞춤 설정
- [ ] 데이터베이스 연동

## 📝 Git 브랜치 전략

- `main`: 프로덕션 릴리스
- `develop`: 개발 통합 브랜치
- `feat/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

## 📸 스크린샷

### 메인 화면
- 실시간 주가 카드 (3개 종목)
- 삼성전자 720일 일봉 차트

## 🤝 기여하기

1. 이슈 생성
2. 자동 생성된 `feat/#` 브랜치에서 작업
3. Pull Request 생성 (develop로)
4. 리뷰 후 병합

## 📄 라이센스

MIT License

## 👨‍💻 개발자

[@YUNCHANGHYEOK](https://github.com/YUNCHANGHYEOK)