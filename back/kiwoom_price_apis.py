import requests
import json


# 키움증권 API 설정 (모의투자용)
access_params = {
    'grant_type': 'client_credentials',
    'appkey': 'O3kJjNLr_qpv4UaI_dlJcu4NZf_8Q4AIGXMu2UZr5WE',
    'secretkey': 'AVTWCe2Wi6h4HX3q3oly0FN2Gq5VsvWNz_W7M9c0kNY',
}

print("=== 키움증권 API 토큰 발급 시도 ===")

try:
    response = requests.post('https://mockapi.kiwoom.com/oauth2/token', json=access_params)
    response_text = response.text
    
    print(f"API 응답 상태 코드: {response.status_code}")
    
    json_start_index = response_text.find('{')
    if json_start_index == -1:
        raise ValueError("응답에서 JSON 형식을 찾을 수 없습니다.")
    
    json_string = response_text[json_start_index:]
    data = json.loads(json_string)
    
    if 'access_token' in data:
        access_token = data['access_token']
        print(f"✅ 토큰 획득 성공")
    elif 'token' in data:
        access_token = data['token']
        print(f"✅ 토큰 획득 성공")
    else:
        print(f"❌ 토큰을 찾을 수 없습니다.")
        raise KeyError("토큰 키를 찾을 수 없습니다.")

except Exception as e:
    print(f"❌ 오류 발생: {e}")
    exit(1)


# ============================================================================
# 주식 시세 관련 API 함수들
# ============================================================================

def test_api_endpoint(token, api_id, endpoint, data, description):
    """API 엔드포인트 테스트 함수"""
    host = 'https://mockapi.kiwoom.com'
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': 'N',
        'next-key': '',
        'api-id': api_id,
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        result = response.json()
        
        print(f'\n=== {api_id} ({description}) ===')
        print(f'Endpoint: {endpoint}')
        print(f'Status Code: {response.status_code}')
        
        if result.get('return_code') == 0:
            print('✅ 성공!')
            print('Response:', json.dumps(result, indent=2, ensure_ascii=False)[:500])
        else:
            print(f'❌ 실패: {result.get("return_msg", "알 수 없는 오류")}')
        
        return result
    except Exception as e:
        print(f'❌ 예외 발생: {e}')
        return None


# fn_ka10001: 주식현재가 (주식기본정보요청)
def fn_ka10001(token, data, cont_yn='N', next_key=''):
    """주식현재가 조회 - 공식 문서 확인됨"""
    host = 'https://mockapi.kiwoom.com'
    endpoint = '/api/dostk/stkinfo'  # ✅ 공식 문서 확인
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': cont_yn,
        'next-key': next_key,
        'api-id': 'ka10001',
    }

    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    print(f'\n=== fn_ka10001 (주식현재가/기본정보) 결과 ===')
    print('Code:', response.status_code)
    print('Body:', json.dumps(result, indent=4, ensure_ascii=False))
    return result


# fn_ka10002: 주식분봉차트
def fn_ka10002(token, data, cont_yn='N', next_key=''):
    """주식분봉차트 조회 - 차트 공통 엔드포인트"""
    host = 'https://mockapi.kiwoom.com'
    endpoint = '/api/dostk/chart'  # ✅ 차트 공통 엔드포인트
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': cont_yn,
        'next-key': next_key,
        'api-id': 'ka10002',
    }

    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    print(f'\n=== fn_ka10002 (주식분봉차트) 결과 ===')
    print('Code:', response.status_code)
    print('Body:', json.dumps(result, indent=4, ensure_ascii=False))
    return result


# fn_ka10003: 주식일봉차트
def fn_ka10003(token, data, cont_yn='N', next_key=''):
    """주식일봉차트 조회 - 차트 공통 엔드포인트"""
    host = 'https://mockapi.kiwoom.com'
    endpoint = '/api/dostk/chart'  # ✅ 차트 공통 엔드포인트
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': cont_yn,
        'next-key': next_key,
        'api-id': 'ka10003',
    }

    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    print(f'\n=== fn_ka10003 (주식일봉차트) 결과 ===')
    print('Code:', response.status_code)
    print('Body:', json.dumps(result, indent=4, ensure_ascii=False))
    return result


# fn_ka10005: 주식종목정보
def fn_ka10005(token, data, cont_yn='N', next_key=''):
    """주식종목정보 조회 - 종목정보 공통 엔드포인트"""
    host = 'https://mockapi.kiwoom.com'
    endpoint = '/api/dostk/stkinfo'  # ✅ 종목정보 공통 엔드포인트
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': cont_yn,
        'next-key': next_key,
        'api-id': 'ka10005',
    }

    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    print(f'\n=== fn_ka10005 (주식종목정보) 결과 ===')
    print('Code:', response.status_code)
    print('Body:', json.dumps(result, indent=4, ensure_ascii=False))
    return result


# ============================================================================
# 공식 문서 기반 정보
# ============================================================================

def print_api_documentation():
    """공식 문서 기반 API 정보 출력"""
    print("\n" + "="*70)
    print("📚 키움 REST API 공식 문서 기반 정보")
    print("="*70)
    print("\nTR ID | 기능 | 엔드포인트 URI")
    print("-" * 70)
    print("ka10001 | 주식현재가/기본정보 | /api/dostk/stkinfo ✅")
    print("ka10002 | 주식분봉차트      | /api/dostk/chart ✅")
    print("ka10003 | 주식일봉차트      | /api/dostk/chart ✅")
    print("ka10005 | 주식종목정보      | /api/dostk/stkinfo ✅")
    print("="*70)


# ============================================================================
# 실행 구간
# ============================================================================
if __name__ == '__main__':
    MY_ACCESS_TOKEN = access_token
    
    # 공식 문서 정보 출력
    print_api_documentation()
    
    print("\n" + "="*70)
    print("🔍 키움증권 REST API 테스트 (공식 문서 기반)")
    print("="*70)
    
    # 기본 테스트 데이터
    test_params = {
        'stk_cd': '005930',  # 삼성전자
    }
    
    print("\n✅ 공식 엔드포인트로 API 호출 테스트")
    print("-" * 70)
    
    # 1. ka10001 - 주식현재가 (stkinfo 엔드포인트)
    print("\n[1] ka10001 - 주식현재가/기본정보")
    fn_ka10001(token=MY_ACCESS_TOKEN, data=test_params)
    
    # 2. ka10002 - 주식분봉차트 (chart 엔드포인트)
    print("\n[2] ka10002 - 주식분봉차트")
    fn_ka10002(token=MY_ACCESS_TOKEN, data=test_params)
    
    # 3. ka10003 - 주식일봉차트 (chart 엔드포인트)
    print("\n[3] ka10003 - 주식일봉차트")
    fn_ka10003(token=MY_ACCESS_TOKEN, data=test_params)
    
    # 4. ka10005 - 주식종목정보 (stkinfo 엔드포인트)
    print("\n[4] ka10005 - 주식종목정보")
    fn_ka10005(token=MY_ACCESS_TOKEN, data=test_params)
    
    print("\n" + "="*70)
    print("✅ 모든 API 테스트 완료")
    print("="*70)
    print("\n💡 사용 가능한 함수:")
    print("  - fn_ka10001(token, data): 주식현재가/기본정보")
    print("  - fn_ka10002(token, data): 주식분봉차트")
    print("  - fn_ka10003(token, data): 주식일봉차트")
    print("  - fn_ka10005(token, data): 주식종목정보")
