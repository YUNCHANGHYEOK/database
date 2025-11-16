# 백엔드 (Backend) - Python

주식 데이터 수집, 처리 및 API 서버를 담당하는 백엔드 애플리케이션입니다.

## 🛠️ 기술 스택

- **Python 3.8+**: 메인 프로그래밍 언어
- **Node.js**: 웹 서버 프레임워크
- **pandas, numpy**: 데이터 처리 및 분석
- **yfinance**: 주식 데이터 API
- **PyKiwoom**: 키움증권 API 연동
- **OpenCV**: 이미지 처리 및 차트 생성

## 📦 설치

```bash
cd back
pip install -r requirements.txt
```

## 🚀 실행

```bash
# Node.js 서버 시작
node app.js

# 키움증권 API 테스트
python api.py

# 환경 테스트
python kiwoom_test.py

# 주피터 노트북 실행
jupyter notebook test.ipynb
```

## 📁 프로젝트 구조

```
back/
├── app.js              # Node.js 웹 서버
├── api.py              # 키움증권 API 연동
├── kiwoom_test.py      # 키움증권 환경 테스트
├── test.ipynb          # 주피터 노트북 (데이터 분석)
├── requirements.txt    # Python 의존성
├── data/               # 데이터 저장 폴더
└── README.md          # 백엔드 문서
```

## ✅ 현재 구현된 기능

1. **키움증권 API 연동**: 실시간 주식 호가 데이터 조회
2. **yfinance 데이터 수집**: 한국 및 글로벌 주식 데이터
3. **OpenCV 차트 생성**: 30일 주가 막대 차트
4. **데이터 처리**: pandas를 이용한 주식 데이터 분석

## 🔧 개발 계획

- [x] 키움증권 API 연동 완료
- [x] 데이터 수집 파이프라인 구축
- [x] 차트 생성 기능
- [ ] Node.js REST API 확장
- [ ] 데이터베이스 연동
- [ ] 실시간 데이터 스트리밍