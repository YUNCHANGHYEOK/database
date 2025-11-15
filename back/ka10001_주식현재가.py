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
# ka10001: 주식현재가/기본정보
# ============================================================================

def fn_ka10001(token, data, cont_yn='N', next_key=''):
    """
    ka10001 - 주식현재가/기본정보 조회
    
    Parameters:
        token: 인증 토큰
        data: 요청 데이터 (예: {'stk_cd': '005930'})
        cont_yn: 연속조회 여부 ('N' 또는 'Y')
        next_key: 연속조회 키
    
    Returns:
        API 응답 결과 (dict)
    """
    host = 'https://mockapi.kiwoom.com'
    endpoint = '/api/dostk/stkinfo'
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': cont_yn,
        'next-key': next_key,
        'api-id': 'ka10001',
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        result = response.json()
        
        print(f'\n=== ka10001 (주식현재가/기본정보) 결과 ===')
        print(f'상태 코드: {response.status_code}')
        print(f'응답 결과:')
        print(json.dumps(result, indent=4, ensure_ascii=False))
        
        if result.get('return_code') == 0:
            print(f'\n✅ 조회 성공!')
            print(f'종목코드: {result.get("stk_cd")}')
            print(f'종목명: {result.get("stk_nm")}')
            print(f'현재가: {result.get("cur_prc")}원')
            print(f'등락률: {result.get("flu_rt")}%')
            print(f'거래량: {result.get("trde_qty")}')
        else:
            print(f'\n❌ 조회 실패: {result.get("return_msg")}')
        
        return result
    
    except Exception as e:
        print(f'❌ 오류 발생: {e}')
        return None


# ============================================================================
# 실행 구간
# ============================================================================
if __name__ == '__main__':
    MY_ACCESS_TOKEN = access_token
    
    print("\n" + "="*70)
    print("📊 ka10001 - 주식현재가/기본정보 조회")
    print("="*70)
    
    # 삼성전자 조회
    print("\n[1] 삼성전자(005930) 조회")
    result1 = fn_ka10001(
        token=MY_ACCESS_TOKEN,
        data={'stk_cd': '005930'}
    )
    
    # 추가 종목 조회 예시
    print("\n[2] SK하이닉스(000660) 조회")
    result2 = fn_ka10001(
        token=MY_ACCESS_TOKEN,
        data={'stk_cd': '000660'}
    )
    
    print("\n" + "="*70)
    print("✅ 조회 완료")
    print("="*70)
