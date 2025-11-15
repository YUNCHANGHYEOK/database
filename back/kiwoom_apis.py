import requests
import json


# 키움증권 API 설정 (모의투자용)
access_params = {
    'grant_type': 'client_credentials',  # grant_type
    'appkey': 'O3kJjNLr_qpv4UaI_dlJcu4NZf_8Q4AIGXMu2UZr5WE',  # 앱키
    'secretkey': 'AVTWCe2Wi6h4HX3q3oly0FN2Gq5VsvWNz_W7M9c0kNY',  # 시크릿키
}

print("=== 키움증권 API 토큰 발급 시도 ===")

try:
    # 모의투자용 API 엔드포인트 사용
    response = requests.post('https://mockapi.kiwoom.com/oauth2/token', json=access_params)
    response_text = response.text
    
    print(f"API 응답 상태 코드: {response.status_code}")
    print(f"API 응답 전체 내용: {response_text}")
    
    # JSON 시작 부분 찾기
    json_start_index = response_text.find('{')
    if json_start_index == -1:
        raise ValueError("응답에서 JSON 형식을 찾을 수 없습니다.")
    
    json_string = response_text[json_start_index:]
    
    # 2. 잘라낸 JSON 문자열을 파이썬 딕셔너리(Dictionary) 형태로 변환
    data = json.loads(json_string)
    print(f"파싱된 데이터: {data}")
    
    # 3. 응답 구조에 따른 토큰 추출
    if 'access_token' in data:
        access_token = data['access_token']
        print(f"✅ access_token으로 토큰 획득: {access_token[:20]}...")
    elif 'token' in data:
        access_token = data['token']
        print(f"✅ token으로 토큰 획득: {access_token[:20]}...")
    else:
        print(f"❌ 토큰을 찾을 수 없습니다. 사용 가능한 키들: {list(data.keys())}")
        raise KeyError("토큰 키를 찾을 수 없습니다.")

except requests.exceptions.RequestException as e:
    print(f"❌ API 요청 실패: {e}")
    exit(1)
except json.JSONDecodeError as e:
    print(f"❌ JSON 파싱 오류: {e}")
    print(f"응답 내용: {response_text}")
    exit(1)
except Exception as e:
    print(f"❌ 오류 발생: {e}")
    exit(1)


# ============================================================================
# 키움 API 함수들
# ============================================================================

# 공통 함수: API 호출 템플릿
def call_kiwoom_api(token, api_id, endpoint, data, cont_yn='N', next_key='', description='API'):
    """키움 API 공통 호출 함수"""
    host = 'https://mockapi.kiwoom.com'
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': cont_yn,
        'next-key': next_key,
        'api-id': api_id,
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        
        print(f'=== {api_id} ({description}) 결과 ===')
        print('Code:', response.status_code)
        print('Header:', json.dumps({key: response.headers.get(key) for key in ['next-key', 'cont-yn', 'api-id']}, indent=4, ensure_ascii=False))
        print('Body:', json.dumps(response.json(), indent=4, ensure_ascii=False))
        return response.json()
    except Exception as e:
        print(f'❌ {api_id} 호출 중 오류 발생: {e}')
        return None


# fn_ka10004: 주식호가 조회 (✅ 검증됨)
def fn_ka10004(token, data, cont_yn='N', next_key=''):
    """주식호가 조회 - 10단계 매수/매도 호가"""
    return call_kiwoom_api(
        token=token,
        api_id='ka10004',
        endpoint='/api/dostk/mrkcond',
        data=data,
        cont_yn=cont_yn,
        next_key=next_key,
        description='주식호가'
    )


# fn_ka10007: 주식체결가 조회
def fn_ka10007(token, data, cont_yn='N', next_key=''):
    """주식체결가 조회 - 최근 체결 정보"""
    return call_kiwoom_api(
        token=token,
        api_id='ka10007',
        endpoint='/api/dostk/mrkcond',
        data=data,
        cont_yn=cont_yn,
        next_key=next_key,
        description='주식체결가'
    )


# fn_ka10008: 주식일자별체결 조회
def fn_ka10008(token, data, cont_yn='N', next_key=''):
    """주식일자별체결 조회"""
    return call_kiwoom_api(
        token=token,
        api_id='ka10008',
        endpoint='/api/dostk/mrkcond',
        data=data,
        cont_yn=cont_yn,
        next_key=next_key,
        description='주식일자별체결'
    )


# fn_ka10009: 주식시간외호가잔량 조회
def fn_ka10009(token, data, cont_yn='N', next_key=''):
    """주식시간외호가잔량 조회"""
    return call_kiwoom_api(
        token=token,
        api_id='ka10009',
        endpoint='/api/dostk/mrkcond',
        data=data,
        cont_yn=cont_yn,
        next_key=next_key,
        description='주식시간외호가잔량'
    )


# fn_ka10010: 주식당일전일분틱조회
def fn_ka10010(token, data, cont_yn='N', next_key=''):
    """주식당일전일분틱 조회"""
    return call_kiwoom_api(
        token=token,
        api_id='ka10010',
        endpoint='/api/dostk/mrkcond',
        data=data,
        cont_yn=cont_yn,
        next_key=next_key,
        description='주식당일전일분틱'
    )


# 추가 API 함수 템플릿 (필요시 추가)
def fn_custom_api(token, api_id, endpoint, data, cont_yn='N', next_key='', description='Custom API'):
    """사용자 정의 API 호출"""
    return call_kiwoom_api(
        token=token,
        api_id=api_id,
        endpoint=endpoint,
        data=data,
        cont_yn=cont_yn,
        next_key=next_key,
        description=description
    )


# ============================================================================
# 실행 구간
# ============================================================================
if __name__ == '__main__':
    # 토큰 설정
    MY_ACCESS_TOKEN = access_token

    print("\n" + "="*60)
    print("✅ 키움증권 API 함수 테스트 (작동 확인된 API만)")
    print("="*60)
    
    # 기본 파라미터: 삼성전자
    test_params = {
        'stk_cd': '005930',  # 삼성전자
    }

    # 1. 주식호가 조회 (fn_ka10004) ✅
    print("\n[1] 주식호가 조회 (fn_ka10004)")
    print("    - 10단계 매수/매도 호가 정보")
    fn_ka10004(token=MY_ACCESS_TOKEN, data=test_params)

    # 2. 주식체결가 조회 (fn_ka10007) ✅
    print("\n[2] 주식체결가 조회 (fn_ka10007)")
    print("    - 현재가, 호가, 체결량 등 종합 정보")
    fn_ka10007(token=MY_ACCESS_TOKEN, data=test_params)

    print("\n" + "="*60)
    print("✅ 모든 작동 API 테스트 완료")
    print("="*60)
    
    print("\n📌 사용 가능한 함수:")
    print("  - fn_ka10004(token, data): 주식호가 조회")
    print("  - fn_ka10007(token, data): 주식체결가 조회")
    print("  - fn_custom_api(token, api_id, endpoint, data): 커스텀 API 호출")
    
    print("\n💡 새로운 API 테스트 방법:")
    print("  result = fn_custom_api(")
    print("      token=MY_ACCESS_TOKEN,")
    print("      api_id='ka10001',")
    print("      endpoint='/api/dostk/price',")
    print("      data={'stk_cd': '005930'},")
    print("      description='주식현재가'")
    print("  )")