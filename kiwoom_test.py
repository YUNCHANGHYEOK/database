# 키움증권 API 간단 테스트
import sys

def test_imports():
    """필요한 모듈들이 설치되어 있는지 확인"""
    print("=== 키움증권 API 모듈 확인 ===")
    
    modules_to_test = [
        ('PyQt5.QtWidgets', 'PyQt5 GUI 프레임워크'),
        ('PyQt5.QtCore', 'PyQt5 코어'),
        ('win32com.client', 'Windows COM 인터페이스'),
        ('pykiwoom.kiwoom', 'PyKiwoom 라이브러리')
    ]
    
    results = {}
    
    for module_name, description in modules_to_test:
        try:
            __import__(module_name)
            print(f"✅ {module_name} - {description}")
            results[module_name] = True
        except ImportError as e:
            print(f"❌ {module_name} - {description}")
            print(f"   오류: {e}")
            results[module_name] = False
    
    return results

def test_kiwoom_ocx():
    """키움증권 OpenAPI OCX 컨트롤 확인"""
    print("\n=== 키움증권 OpenAPI 확인 ===")
    
    try:
        import win32com.client as win32
        kiwoom_ocx = win32.Dispatch("KHOPENAPI.KHOpenAPICtrl.1")
        print("✅ 키움증권 OpenAPI 설치됨")
        return True
    except Exception as e:
        print(f"❌ 키움증권 OpenAPI 미설치: {e}")
        print("   해결방법: https://www.kiwoom.com → 고객센터 → OpenAPI")
        return False

def main():
    print("키움증권 API 환경 테스트를 시작합니다...\n")
    
    # 모듈 테스트
    import_results = test_imports()
    
    # OpenAPI 테스트
    ocx_result = test_kiwoom_ocx()
    
    # 전체 결과
    print("\n=== 테스트 결과 요약 ===")
    
    all_imports_ok = all(import_results.values())
    
    if all_imports_ok and ocx_result:
        print("🎉 모든 테스트 통과! 키움증권 API 사용 준비 완료!")
        print("\n다음 단계:")
        print("1. 키움증권 계좌 로그인")
        print("2. 주식 데이터 조회 테스트")
        print("3. 실시간 데이터 수신 테스트")
    else:
        print("⚠️  일부 요구사항이 충족되지 않았습니다.")
        print("\n해결해야 할 사항:")
        
        for module, status in import_results.items():
            if not status:
                if 'PyQt5' in module:
                    print(f"- {module}: conda install pyqt 또는 pip install PyQt5")
                elif 'win32com' in module:
                    print(f"- {module}: pip install pywin32")
                elif 'pykiwoom' in module:
                    print(f"- {module}: pip install pykiwoom")
        
        if not ocx_result:
            print("- 키움증권 OpenAPI: KOA Studio 설치 필요")

if __name__ == "__main__":
    main()