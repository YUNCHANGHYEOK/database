import sys
import os

# 키움증권 API 테스트 및 PyKiwoom 연동
def test_kiwoom_environment():
    """키움증권 API 환경 테스트"""
    print("=== 키움증권 API 환경 검사 ===")
    
    # 1. PyQt5 확인
    try:
        from PyQt5.QtWidgets import QApplication, QLabel, QWidget, QVBoxLayout, QPushButton
        from PyQt5.QtCore import Qt
        print("✅ PyQt5 설치 확인됨")
    except ImportError:
        print("❌ PyQt5 설치 필요")
        return False
    
    # 2. win32com 확인
    try:
        import win32com.client as win32
        print("✅ win32com 설치 확인됨")
    except ImportError:
        print("❌ pywin32 설치 필요: pip install pywin32")
        return False
    
    # 3. 키움증권 OpenAPI 확인
    try:
        kiwoom_ocx = win32.Dispatch("KHOPENAPI.KHOpenAPICtrl.1")
        print("✅ 키움증권 OpenAPI 설치 확인됨")
    except Exception:
        print("❌ 키움증권 OpenAPI 미설치")
        print("   해결방법: KOA Studio 다운로드 및 설치")
        return False
    
    # 4. PyKiwoom 확인
    try:
        from pykiwoom.kiwoom import Kiwoom
        print("✅ PyKiwoom 모듈 확인됨")
    except ImportError:
        print("❌ PyKiwoom 설치 필요: pip install pykiwoom")
        return False
    
    print("✅ 모든 환경 요구사항 충족!")
    return True

def create_kiwoom_gui():
    """키움증권 API GUI 테스트 애플리케이션"""
    from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QTextEdit, QLabel
    from PyQt5.QtCore import Qt
    
    app = QApplication(sys.argv)
    
    # 메인 윈도우
    window = QWidget()
    window.setWindowTitle("키움증권 API 테스트")
    window.resize(500, 400)
    
    # 레이아웃 설정
    layout = QVBoxLayout()
    
    # 상태 표시 레이블
    status_label = QLabel("키움증권 API 테스트 준비")
    status_label.setAlignment(Qt.AlignCenter)
    layout.addWidget(status_label)
    
    # 로그인 버튼
    login_btn = QPushButton("키움증권 로그인")
    layout.addWidget(login_btn)
    
    # 결과 표시 영역
    result_text = QTextEdit()
    result_text.setReadOnly(True)
    layout.addWidget(result_text)
    
    def on_login_clicked():
        try:
            from pykiwoom.kiwoom import Kiwoom
            result_text.append("키움증권 로그인 시도 중...")
            
            kiwoom = Kiwoom()
            login_result = kiwoom.CommConnect(block=True)
            
            if login_result == 0:
                result_text.append("✅ 로그인 성공!")
                
                # 계좌 정보 가져오기
                accounts = kiwoom.GetLoginInfo("ACCNO")
                user_id = kiwoom.GetLoginInfo("USER_ID")
                user_name = kiwoom.GetLoginInfo("USER_NAME")
                
                result_text.append(f"사용자 ID: {user_id}")
                result_text.append(f"사용자 이름: {user_name}")
                result_text.append(f"보유 계좌: {accounts}")
                
                status_label.setText("키움증권 로그인 완료!")
                
            else:
                result_text.append(f"❌ 로그인 실패 (코드: {login_result})")
                
        except Exception as e:
            result_text.append(f"❌ 오류 발생: {e}")
    
    login_btn.clicked.connect(on_login_clicked)
    
    window.setLayout(layout)
    window.show()
    
    return app

if __name__ == "__main__":
    print("키움증권 API 테스트 시작...")
    
    # 환경 검사
    if test_kiwoom_environment():
        print("\nGUI 애플리케이션을 시작합니다...")
        try:
            app = create_kiwoom_gui()
            sys.exit(app.exec_())
        except Exception as e:
            print(f"GUI 실행 오류: {e}")
    else:
        print("\n환경 설정을 완료한 후 다시 실행하세요.")
        
    print("\n추가 도움말:")
    print("1. 키움증권 계좌 개설 필요")
    print("2. KOA Studio 설치")
    print("3. 32비트 Python 환경 권장")
    print("4. 모의투자 신청 후 테스트 가능")