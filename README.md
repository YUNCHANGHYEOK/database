# 📊 Database Project - 주식 데이터 분석 플랫폼

한국 주식 시장 데이터를 수집, 분석, 시각화하는 풀스택 웹 애플리케이션입니다.

## 🏗️ 프로젝트 구조

```
database_project/
├── back/                   # 백엔드 (Python)
│   ├── app.js             # Node.js 웹 서버
│   ├── api.py             # 키움증권 API 연동
│   ├── kiwoom_test.py     # API 환경 테스트
│   ├── test.ipynb         # 데이터 분석 노트북
│   ├── requirements.txt   # Python 의존성
│   └── README.md          # 백엔드 문서
│
├── front/                 # 프론트엔드 (React/Next.js)
│   ├── src/               # 소스 코드
│   ├── public/            # 정적 파일
│   ├── package.json       # Node.js 의존성
│   └── README.md          # 프론트엔드 문서
│
├── docs/                  # 프로젝트 문서
├── .github/               # GitHub 설정
└── README.md             # 전체 프로젝트 개요
```

## 🚀 주요 기능

### ✅ 완료된 기능
- **키움증권 API 연동**: 실시간 주식 호가 데이터 수집
- **yfinance 데이터 수집**: 한국 및 글로벌 주식 데이터
- **OpenCV 차트 생성**: 30일 주가 막대 차트 시각화
- **데이터 분석**: pandas, numpy 기반 주식 데이터 처리

### 🔄 개발 중
- **Node.js 서버**: RESTful API 구축
- **React 프론트엔드**: 사용자 인터페이스 개발

## 🛠️ 기술 스택

### 백엔드 (Python)
- Node.js, requests, python-dotenv
- PyKiwoom (키움증권 API)
- OpenCV (차트 생성)

### 프론트엔드 (JavaScript/TypeScript)
- React 18, Next.js 14
- TypeScript

## 📦 설치 및 실행

### 백엔드 설정
```bash
cd back
pip install -r requirements.txt
python app.py
```

### 프론트엔드 설정
```bash
cd front
npm install
npm run dev
```

## 🔄 개발 진행 상황

- [x] 키움증권 API 연동 완료
- [x] 데이터 수집 및 처리 파이프라인
- [x] OpenCV 차트 생성 기능
- [x] 프로젝트 구조 정리 (back/front 분리)
- [ ] Node.js API 서버 확장
- [ ] React 프론트엔드 개발
- [ ] 실시간 데이터 스트리밍
- [ ] 사용자 인증 시스템

## 📝 브랜치 전략

- `main`: 프로덕션 브랜치
- `feat/1`: 주가 그래프 시각화
- `feat/3`: 키움API 실행 로직 수정

## 📄 라이센스

MIT License